// Load peer dependencies dynamically, to allow for them not being installed.
export class MissingPeerDependency extends Error{
    constructor(dependency){
        super(`Trying to use peer-dependency ${dependency}, but it isn't installed. Did you forget it?`);
    }
}

export default { 
    Nano: await import('nano').then(module => module.default).catch(error => {
        if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
        return () => { throw new MissingPeerDependency('nano')};
    }),
    Redis: await import('ioredis').then(module => module.default).catch(error => {
        if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
        return () => { throw new MissingPeerDependency('ioredis')};
    })
};