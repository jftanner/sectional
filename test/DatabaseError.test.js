import { DatabaseError } from 'sectional';
import { expect } from './common.js';

describe('DatabaseError', function () {
    it('extends Error', function () {
        expect(new DatabaseError()).to.be.an.instanceOf(Error);
    });

    it('persists certain status codes', function(){
        for (const code of [404, 409, 410]){
            const error = new DatabaseError({statusCode: code});
            expect(error).to.have.property('statusCode', code);
        }
    })

    it('filters other status codes', function(){
        for (const code of [401, 403, 500]){
            const error = new DatabaseError({statusCode: code});
            expect(error).to.not.have.property('statusCode');
        }
    })
});