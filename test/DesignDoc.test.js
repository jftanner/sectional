import { DesignDoc } from 'sectional';
import DatabaseError from '../lib/DatabaseError.js';
import { expect, chance, sinon } from './common.js';

// An example query, filtering an index to just document ids starting with "user:".
const userQueryTemplate = {
    language: 'query',
    views: {
        all: {
            map: {
                fields: { _id: 'asc' },
                partial_filter_selector: { _id: { '$regex': '^user:' } }
            },
            options: {
                def: { fields: ['_id'] }
            }
        }
    }
};


// An example view, for looking up users by email.
const userViewsTemplate = {
    // `language: 'javascript'` is implied
    views: {
        count: {
            map: function (doc) {
                if (doc._id.startsWith('user:')) emit(doc.created, 1);
            },
            reduce: '_count'
        },
        byEmail: {
            map: function (doc) {
                if (doc._id.startsWith('user:')) emit(doc.email, doc.name);
            }
        }
    }
};

describe('DesignDoc', function () {
    it('supports query docs', function () {
        const name = chance.word();
        const template = userQueryTemplate;
        const designDoc = new DesignDoc(name, template);
        expect(designDoc.name).to.equal(name);
        // TODO validate the document
    });

    it('supports view docs', function () {
        const name = chance.word();
        const template = userViewsTemplate;
        const designDoc = new DesignDoc(name, template);
        expect(designDoc.name).to.equal(name);
        // TODO Validate the document.
    });

    it('identifies views', function () {
        const designDoc = new DesignDoc(chance.word(), userViewsTemplate);
        expect(designDoc.hasView('count')).to.be.true;
        expect(designDoc.hasView('byEmail')).to.be.true;
        expect(designDoc.hasView('all')).to.be.false;
        expect(designDoc.hasView(chance.word())).to.be.false;
    });

    it('throws without a valid name', function () {
        const fn = sinon.stub();
        for (const name of [null, undefined, false, '', 0, 42, [], {}, fn]) {
            const instantiate = () => new DesignDoc(name, userViewsTemplate);
            expect(instantiate, `Name: ${name}`).to.throw(DatabaseError);
            expect(instantiate, `Name: ${name}`).to.throw('Invalid name for design doc');
        }
        expect(fn).to.not.have.been.called;
    });
    it('throws without a valid template', function () {
        const fn = sinon.stub();
        for (const template of [null, undefined, false, "myTemplate", '', 0, 42, fn]) {
            const instantiate = () => new DesignDoc(chance.word(), template);
            expect(instantiate, `Template: ${template}`).to.throw(DatabaseError);
            expect(instantiate, `Template: ${template}`).to.throw('Invalid template for design doc');
        }
        expect(fn).to.not.have.been.called;
    });
    it('throws on unknown languages', function () {
        const language = chance.word();
        const instantiate = () => new DesignDoc(chance.word(), { language });
        expect(instantiate).to.throw(DatabaseError);
        expect(instantiate).to.throw(`Unknown design language: ${language}`);
    });
});