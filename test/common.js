import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import Chance from 'chance';

// Enable chai modules
chai.use(chaiAsPromised);
chai.use(sinonChai);

export { expect } from 'chai';
export { default as sinon } from 'sinon';
export const chance = new Chance();

export const COUCH_URL = "http://localhost:5984";

// Allow stubbing of connection dependencies.
import connect from '../lib/connect.js';
import { stub } from 'sinon';
export function stubNano() {
    const nano = {
        db: {
            get: stub(),
            create: stub()
        },
        use: stub().returns({
            list: stub(),
            get: stub(),
            insert: stub(),
            destroy: stub(),
            view: stub(),
            find: stub()
        })
    };
    // Stub the the function to return a mock Nano instance.
    const Nano = stub(connect, 'Nano').returns(nano);
    return { Nano, nano };
}
