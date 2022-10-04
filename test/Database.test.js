import Database from 'sectional';
import NanoCouch from 'sectional/NanoCouch';
import DatabaseError from '../lib/DatabaseError.js';
import { sinon, expect, chance, stubNano } from './common.js';


describe('Database Class', function () {
    afterEach(() => sinon.restore());

    it('uses nano by default', async function () {
        const { nano } = stubNano();
        const db = chance.word();
        const database = await Database.connect(db);
        expect(database).to.exist;
        expect(database.couch).to.be.an.instanceOf(NanoCouch);
        expect(nano.db.get).to.have.been.calledOnceWithExactly(db);
        expect(nano.db.create).to.have.not.been.called;
    });

    it('creates missing databases', async function () {
        const { nano } = stubNano();
        nano.db.get.rejects({ statusCode: 404 });
        const db = chance.word();
        const database = await Database.connect(db);
        expect(nano.db.get).to.have.been.calledOnceWithExactly(db);
        expect(nano.db.create).to.have.been.calledOnceWithExactly(db);
    });

    it("throws if missing database can't be created", async function () {
        const { nano } = stubNano();
        nano.db.get.rejects({ statusCode: 404 });
        nano.db.create.rejects();
        const db = chance.word();
        const promise = Database.connect(db)
        await expect(promise).to.eventually.be.rejectedWith(DatabaseError);
        await expect(promise).to.eventually.be.rejectedWith("Unable to create database");
        expect(nano.db.get).to.have.been.calledOnceWithExactly(db);
        expect(nano.db.create).to.have.been.calledOnceWithExactly(db);
    });

    it("throws on unexpected errors creating the database", async function () {
        const { nano } = stubNano();
        nano.db.get.rejects({ statusCode: 500 });
        const db = chance.word();
        const promise = Database.connect(db)
        await expect(promise).to.eventually.be.rejectedWith(DatabaseError);
        await expect(promise).to.eventually.be.rejectedWith("Unable to connect to database");
        expect(nano.db.get).to.have.been.calledOnceWithExactly(db);
        expect(nano.db.create).to.have.not.been.called;
    });
});