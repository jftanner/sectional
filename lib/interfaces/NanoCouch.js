import { createHash } from 'crypto';
import AbstractCouch, { CouchInterfaceError } from "./AbstractCouch.js";
import connect from '../connect.js';

/**
 * A map of nano instances by URL, for re-use.
 */
const nanoInstances = new Map();


export default class NanoCouch extends AbstractCouch {
    static get nanoInstances(){
        return nanoInstances;
    }

    constructor(...params) {
        super(...params);

        if (this.options?.nano) {
            this._nano = this.options.nano;
            if (this.options.url || this.options.username || this.options.password || this.options.nanoOpts) {
                throw new CouchInterfaceError('Cannot use other options when setting "options.nano"');
            }
        }
        else {
            // Configure Nano
            const url = new URL(this.options?.url || process.env.COUCHDB_URL || 'http://localhost:5984');
            const username = this.options?.username || process.env.COUCHDB_USERNAME;
            const password = this.options?.password || process.env.COUCHDB_PASSWORD;
            if (username) url.username = username;
            if (password) url.password = password;

            const nanoOpts = {
                url: url.href,
                ...this.options?.nanoOpts
            };
            const nanoClientId = createHash('sha1').update(JSON.stringify(nanoOpts)).digest('hex');
            this._nano = nanoInstances.get(nanoClientId) || connect.Nano(nanoOpts);
            nanoInstances.set(nanoClientId, this.nano);
        }
        this._database = this._nano.use(this.db);
    }

    async getDatabase() {
        return this._nano.db.get(this.db);
    }

    async createDatabase() {
        return this._nano.db.create(this.db);
    }

    async list(options) {
        return this._database.list(options);
    }

    async get(docId) {
        return this._database.get(docId);
    }

    async insert(document) {
        return this._database.insert(document);
    }

    async destroy(document) {
        return this._database.destroy(document._id, document._rev);
    }

    async view(designName, viewName, options) {
        return this._database.view(designName, viewName, options);
    }

    async find(query) {
        return this._database.find(query);
    }
}