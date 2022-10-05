import AbstractCouch, { CouchInterfaceError } from 'sectional/AbstractCouch';
import { expect, chance } from '../common.js';

const abstractMethods = [
    'getDatabase',
    'createDatabase',
    'list',
    'get',
    'insert',
    'destroy',
    'view',
    'find'
];

export default function runAbstractCouchTests() {
    describe('AbstractCouch', function () {
        it('throws an error if instantiated', function () {
            const instantiate = () => new AbstractCouch();
            expect(instantiate).to.throw(CouchInterfaceError);
            expect(instantiate).to.throw('Cannot instantiate AbstractCouch class');
        });
    });

    describe('EmptyCouch', function () {
        class EmptyCouch extends AbstractCouch {
            constructor(...params) { super(...params); }
        }
        const db = chance.word();
        const options = {};
        const instantiate = () => new EmptyCouch(db, options);

        it('can be intantiated', function () {
            expect(instantiate).to.not.throw();
            expect(instantiate()).to.be.instanceOf(EmptyCouch);
            expect(instantiate()).to.be.instanceOf(AbstractCouch);

            const instance = instantiate();
            expect(instance.db).to.equal(db);
            expect(instance.options).to.equal(options);
        });

        describe('instance', function () {
            // Create tests for each of the defined methods:
            abstractMethods.forEach(method => {
                it(`.${method}() should throw the expected error`, async function () {
                    const emptyCouch = instantiate();
                    const invocation = () => emptyCouch[method]();
                    await expect(invocation()).to.eventually.be.rejectedWith(CouchInterfaceError);
                    await expect(invocation()).to.eventually.be.rejectedWith(`EmptyCouch interface does not implement ${method}()`);
                });
            });
        });
    });
}