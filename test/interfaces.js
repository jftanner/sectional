import runAbstractCouchTests from './interfaces/AbstractCouch.test.js';
import runNanoCouchTests from './interfaces/NanoCouch.test.js';

describe('Couch Interfaces', function(){
    runAbstractCouchTests();
    runNanoCouchTests();
})