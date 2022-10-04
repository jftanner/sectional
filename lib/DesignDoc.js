import DatabaseError from "./DatabaseError.js";

/**
 * A design doc defines views and indexes in the database.
 * This helper class makes it easier to define a design doc and update it at runtime.
 */
export default class DesignDoc {
    constructor(name, template) {
        if (!name || typeof name !== 'string') throw new DatabaseError('Invalid name for design doc');
        if (!template || typeof template !== 'object') throw new DatabaseError('Invalid template for design doc');
        this.name = name;

        // Determine the view language.
        const isQueryDesign = template.language === 'query';
        const isJSDesign = !template.language || template.language === 'javascript'
        if (!isQueryDesign && !isJSDesign) throw new DatabaseError(`Unknown design language: ${template.language}`);

        // TODO Validate the template
        // See https://docs.couchdb.org/en/3.2.2-docs/api/ddoc/common.html#put--db-_design-ddoc

        // Parse the template into a valid format for the design document.
        const parseToDocument = (item) => {
            if (Array.isArray(item)) {
                return item.map(value => parseToDocument(value));
            }
            if (typeof item === 'object') {
                return Object.entries(item).reduce((acc, [key, value]) => {
                    acc[key] = parseToDocument(value);
                    return acc;
                }, {});
            }
            if (typeof item === 'function') {
                return item.toString();
            }
            else return item;
        };
        this.document = { _id: `_design/${name}`, ...parseToDocument(template) };
    }

    // TODO Add a validator

    /**
     * Check whether this design doc contains a view with the given name.
     * @param {string} view - View name to check
     * @returns {boolean} Whether or not this design doc defines that view
     */
    hasView(view) {
        return Boolean(this.document?.views?.[view]?.map);
    }
}