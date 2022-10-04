export default class DatabaseError extends Error {
    constructor(baseError) {
        super(baseError);
        this.name = "DatabaseError";

        // Most status codes should not be returned to users.
        const allowedStatuses = [404, 409, 410];
        if (allowedStatuses.includes(baseError?.statusCode)) this.statusCode = baseError.statusCode;
    }
}