export class CouchInterfaceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CouchInterfaceError';
    }
}

function throwNotImplemented(instance, method) {
    throw new CouchInterfaceError(`${instance.constructor.name} interface does not implement ${method}()`);
}

export default class AbstractCouch {

    constructor(db, options) {
        if (this.constructor === AbstractCouch) throw new CouchInterfaceError('Cannot instantiate AbstractCouch class');
        this.db = db;
        this.options = options;
    }

    async getDatabase() {
        throwNotImplemented(this, 'getDatabase');
    }

    async createDatabase() {
        throwNotImplemented(this, 'createDatabase');
    }

    async list(options) {
        throwNotImplemented(this, 'list');
    }

    async get(docId, options) {
        throwNotImplemented(this, 'get');
    }

    async insert(document, options) {
        throwNotImplemented(this, 'insert');
    }

    async destroy(document, options) {
        throwNotImplemented(this, 'destroy');
    }
    async view(designDoc, view, options) {
        throwNotImplemented(this, 'view');
    }

    async find(options) {
        throwNotImplemented(this, 'find');
    }
}