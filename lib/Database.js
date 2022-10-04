import DatabaseError from './DatabaseError.js';
import DesignDoc from './DesignDoc.js';
import AbstractCouch from './interfaces/AbstractCouch.js';

const cacheDuration = Number(process.env.CACHE_DURATION) || 600;

export let cacheHits = 0;
export let cacheMisses = 0;

function throwError(error) {
    throw new DatabaseError(error);
}

export default class Database {

    static async connect(db, options) {
        if (!db) throw DatabaseError('Cannot create a Database instance without database name');

        // Define interfaces.
        const interfaces = {};

        // Decide which couch interface to use.
        if (options?.couch?.interface) interfaces.couch = options.couch.interface;
        else {
            // TODO Support automatically configuring Cloudant.
            const { default: NanoCouch } = await import('./interfaces/NanoCouch.js');
            interfaces.couch = new NanoCouch(db, options?.couch);
        }

        // Attach Redis
        if (options?.redis?.client) interfaces.redis = options.redis.client;
        else if (options?.redis !== false) {
            const { Redis } = await import('./connect.js');
            const client = new Redis({
                // lazyConnect: true,
                host: options?.redis?.host || process.env.REDIS_HOST
                // TODO Handle more options;
            });
            // TODO Connect to redis.
        }

        const database = new Database(db, interfaces, options);
        await database.initialize();
        return database;
    }

    constructor(db, interfaces, options) {
        /** @type {AbstractCouch} */
        this.db = db;
        this.options = options;
        this.couch = interfaces.couch;
        this.redis = interfaces.redis;
        this.designs = new Map();
    }

    async initialize() {
        // TODO Re-implement logging.
        // logger.debug(`Initializing ${db}`);
        await this.couch.getDatabase(this.db).catch(async error => {
            if (error.statusCode === 404) {
                // logger.warn('Database does not exist and will be created');
                await this.couch.createDatabase(this.db).catch(error => {
                    throwError('Unable to create database');
                });
            }
            else throwError('Unable to connect to database');
        });
    }

    /**
     * Get all documents from the database.
     * @returns {Promise<object[]>}
     */
    async list(options) {
        return this.database.list(options).catch(throwError);
    }

    /**
     * Get a document from the database.
     * @param {string} docId - Document ID to fetch
     * @returns {Promise<object>}
     */
    async get(docId, options) {
        const useCache = options?.cache !== false;
        let document;

        // Check the high-speed redis cache first.
        if (useCache) document = await redis.get(docId)
            .then(cached => {
                if (cached) {
                    cacheHits++;
                    return JSON.parse(cached);
                }
                logger.debug(`Cache miss for ${docId}`);
                cacheMisses++;
            })
            .catch(async error => {
                logger.error(`Cache error:`, error);
                await redis.del(docId)
                    .catch(error => logger.error("Failed to delete broken cache:", error));
                return null;
            });

        // If we haven't loaded the document from cache, check couch.
        if (!document) {
            // If it's not there, check couch and update the cache.
            document = await this.database.get(docId).catch(throwError);
            if (useCache) await redis.set(docId, JSON.stringify(document));
        }
        // Set or refresh the cache TTL.
        if (useCache) await redis.expire(docId, cacheDuration);
        return document;
    }

    /**
     * Save the given document to the database.
     * @param {object} document - Document to save to the database
     * @param {string} document._id - Document ID
     * @param {string} [document._rev] - Document Revision
     * @returns {Promise<string>} New revision of the saved document
     */
    async insert(document, options) {
        if (!document?._id) throwError('Missing `_id` for document');
        const { rev } = await this.database.insert(document).catch(throwError);
        document._rev = rev;
        if (options?.cache !== false) await redis.set(document._id, JSON.stringify(document));
        return rev;
    }

    async destroy(document, options) {
        if (!document?._id) throwError('Missing `_id` for document');
        if (!document?._rev) throwError('Missing `_rev` for document');
        const response = await this.database.destroy(document._id, document._rev);
        // TODO Validate the response.
        delete document._rev;
        if (options?.cache !== false) await redis.del(document._id);
    }

    /**
     * Query a pre-configured view in the database.
     * @param {DesignDoc} designDoc - Design document that defines the view
     * @param {string} view - Name of the view to query
     * @param {object} options - See `params` at https://www.npmjs.com/package/nano#dbviewdesignname-viewname-params-callback
     * @returns {Promise<CloudantV1.ViewResult>}
     */
    async view(design, view, options) {
        // Validate the design doc and view.
        if (!design) throwError('Missing design doc id for view query');
        if (!view) throwError('Missing view name for view query');
        const designDoc = this.designs.get(design);
        if (!designDoc) throwError(`Unknown design doc "${design}"`);
        if (!designDoc.hasView(view)) throwError(`The design doc" ${design}" does not have view "${view}"`);

        // Fetch the view.
        return this.database.view(designDoc.name, view, options).catch(throwError);
    }

    async find(options) {
        if (!options?.selector) throwError('A selector is required for queries');
        const query = {
            ...options,
            execution_stats: true
        };
        const response = await this.database.find(query);
        if (response.warning) logger.warn(`CouchDB.find warning: ${response.warning}`);
        if (response.execution_stats) {
            const {
                execution_time_ms: time,
                results_returned: returned,
                total_docs_examined: examined
            } = response.execution_stats;
            const message = `Took ${time}ms to find ${pluralize('document', returned, true)} (Examined ${examined})`;
            if (time > Number(process.env.DATABASE_SLOW_MS || 10)) logger.warn(message);
            else logger.debug(message);
        }

        // If the response returned the limit requested, add a shortcut to get more.
        if (response?.docs?.length === (query.limit || 25)) {
            response.getNextPage = async () => find({ ...query, bookmark: response.bookmark });
        }
        return response;
    }

    /**
     * Ensure that the given design doc exists in the database.
     * If it doesn't exist, it is created.
     * If it does exist, but is different, it is updated.
     * @returns {Promise<void>}
     */
    async insertDesign(designDoc, options) {
        logger.debug(`Asserting design document: ${this.name}`);
        if (!(designDoc instanceof DesignDoc)) throw DatabaseError('Designs must be instances of DesignDoc');
        const existingDoc = await this.get(this.document._id, { cache: false })
            .catch(error => {
                // Ignore 404s, since we'll create the document.
                if (error.statusCode === 404) return;
                throwError(error);
            });

        // Compare the existing document to the desired one.
        if (existingDoc) {
            const stringifyDoc = (doc) => {
                const { _id, _rev, ...rest } = doc;
                return JSON.stringify(rest);
            };
            if (stringifyDoc(existingDoc) === stringifyDoc(this.document)) {
                logger.debug(`No changes required for design document ${this.name}@${existingDoc._rev}`);
                return;
            }
        }

        // Publish a new or updated version.
        designDoc.document._rev = existingDoc?._rev;
        await this.insert(this.document, { cache: false })
            .then(revision => {
                this.designs.set(designDoc.name, designDoc);
                logger.info(`Updated design document ${this.name}@${revision}`);
            })
            .catch(error => {
                if (error.statusCode !== 409) throw error;
                if (options?.acceptConflict === false) {
                    const error = new DatabaseError(`Failed to update design doc "${designDoc.name}": update conflict`);
                    error.statusCode = 409;
                    throw error;
                }
                return this.insertDesign(designDoc, { ...options, acceptConflict: false });
            });
    }
};
