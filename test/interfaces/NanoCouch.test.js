import AbstractCouch, { CouchInterfaceError } from 'sectional/AbstractCouch';
import NanoCouch from 'sectional/NanoCouch';
import { expect, chance, sinon, stubNano } from '../common.js';

const COUCH_URL = 'http://localhost:5984';

export default function runNanoCouchTests() {
    describe('NanoCouch', function () {
        let stubs;
        beforeEach('Stub nano', function () {
            stubs = stubNano();
        });

        afterEach(sinon.restore);

        it('can be intantiated', function () {
            const db = chance.word();
            const options = {};
            const instantiate = () => new NanoCouch(db, options);

            expect(instantiate).to.not.throw();
            expect(instantiate()).to.be.instanceOf(NanoCouch);
            expect(instantiate()).to.be.instanceOf(AbstractCouch);

            // Test properties generic to the abstract interface.
            const instance = instantiate();
            expect(instance.db).to.equal(db);
            expect(instance.options).to.equal(options);

            // Test properties specific to Nano.
            expect(instance._nano).to.exist;
            expect(instance._database).to.exist;
        });

        it('accepts a url', function () {
            const db = chance.word();
            const options = { url: chance.url({ path: '' }) };
            const expected = {
                url: new URL(options.url).href
            };
            const instance = new NanoCouch(db, options);
            expect(instance._nano).to.exist;
            expect(stubs.Nano).to.have.been.calledOnceWithExactly(expected);
        });

        it('accepts a username and password', function () {
            const db = chance.word();
            const options = { username: chance.word(), password: chance.word() };
            const expectedUrl = new URL(COUCH_URL);
            expectedUrl.username = options.username;
            expectedUrl.password = options.password;
            const expected = {
                url: expectedUrl.href
            };

            const instance = new NanoCouch(db, options);
            expect(instance._nano).to.exist;
            expect(stubs.Nano).to.have.been.calledOnceWithExactly(expected);
        });

        it('accepts a custom nano instance', function () {
            const nano = {url: 'Fake nano instance', use: sinon.stub()}
            const db = chance.word();
            const options = { nano };
            const instance = new NanoCouch(db, options);
            expect(instance._nano).to.equal(nano);
            expect(stubs.Nano).to.not.have.been.called;
            expect(nano.use).to.have.been.calledOnceWithExactly(db);
        });

        it('throws if given incompatible options', function () {
            const nano = {url: 'Fake nano instance', foo: chance.word()}
            const db = chance.word();
            for (const option of ['username', 'password', 'nanoOpts']) {
                const options = { nano, [option]: chance.word };
                const instantiate = () => new NanoCouch(db, options);
                expect(instantiate).to.throw(CouchInterfaceError);
                expect(instantiate).to.throw('Cannot use other options when setting "options.nano"');
            }
            expect(stubs.Nano).to.not.have.been.called;
        });

        describe('instance', function () {
            /** @type {NanoCouch} */
            let instance;
            this.beforeEach('Instantiate Interface', function () {
                NanoCouch.nanoInstances.clear();
                instance = new NanoCouch(chance.word());
            });

            it('.getDatabase() calls Nano', async function () {
                await instance.getDatabase();
                expect(instance._nano.db.get).to.have.been.calledOnceWithExactly(instance.db);
            });

            it('.createDatabase() calls Nano', async function () {
                await instance.createDatabase();
                expect(instance._nano.db.create).to.have.been.calledOnceWithExactly(instance.db);
            });

            it('.list() calls Nano', async function () {
                const options = { foo: chance.word() };
                await instance.list(options);
                expect(instance._database.list).to.have.been.calledOnceWithExactly(options);
            });

            it('.get() calls Nano', async function () {
                const docId = chance.guid();
                await instance.get(docId);
                expect(instance._database.get).to.have.been.calledOnceWithExactly(docId);
            });

            it('.insert() calls Nano', async function () {
                const document = { _id: chance.guid() };
                await instance.insert(document);
                expect(instance._database.insert).to.have.been.calledOnceWithExactly(document);
            });

            it('.destroy() calls Nano', async function () {
                const document = {
                    _id: chance.guid(),
                    _rev: chance.guid()
                };
                await instance.destroy(document);
                expect(instance._database.destroy).to.have.been.calledOnceWithExactly(document._id, document._rev);
            });

            it('.view() calls Nano', async function () {
                const designName = chance.word();
                const viewName = chance.word();
                const options = { foo: chance.word() };
                await instance.view(designName, viewName, options);
                expect(instance._database.view).to.have.been.calledOnceWithExactly(designName, viewName, options);
            });

            it('.find() calls Nano', async function () {
                const options = { foo: chance.word() };
                await instance.find(options);
                expect(instance._database.find).to.have.been.calledOnceWithExactly(options);
            });
        });
    });
}