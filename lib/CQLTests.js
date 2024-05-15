const fs = require('fs');
const path = require('path');
const CQLTest = require('./CQLTest');
const CQLResults = require('./CQLResults');

/**
 * Represents a collection of CQL tests.
 * @class
 */
class CQLTests {
    /**
     * Directory name for caching tests.
     * @type {string}
     * @static
     */
    static CACHE_DIR = 'tests';

    /**
     * Creates an instance of CQLTests.
     * @param {string} [savePath=null] - The path to save test results.
     */
    constructor(savePath = null) {
        /**
         * Path where test results are saved.
         * @type {string}
         * @private
         */
        this.savePath = null;
        this._prepareSavePath(savePath);
        /**
         * Array to store added tests.
         * @type {CQLTest[]}
         */
        this.tests = [];
    }

    /**
     * Prepares the save path for test results.
     * @private
     * @param {string} savePath - The path to save test results.
     */
    _prepareSavePath(savePath) {
        if (savePath && fs.existsSync(savePath)) {
            const testSavePath = path.join(savePath, CQLTests.CACHE_DIR);
            for (const status of Object.values(CQLTest.STATUS)) {
                const statusPath = path.join(testSavePath, status);
                fs.mkdirSync(statusPath, { recursive: true });
            }
            this.savePath = testSavePath;
        }
    }

    /**
     * Gets the save path based on test status.
     * @private
     * @param {string} status - The status of the test.
     * @returns {string} The save path.
     */
    _getSavePathOnStatus(status) {
        if (Object.values(CQLTest.STATUS).includes(status)) {
            return path.join(this.savePath, status);
        }
    }

    /**
     * Caches the test result.
     * @private
     * @param {CQLTest} test - The test to cache.
     * @param {string} testStatus - The status of the test.
     * @param {boolean} force - Flag indicating whether to force caching.
     */
    _cacheTest(test, testStatus, force) {
        const savePath = this._getSavePathOnStatus(testStatus);
        if (fs.existsSync(savePath)) {
            test.save(savePath, force);
        }
        for (const status of Object.values(CQLTest.STATUS)) {
            if (status !== testStatus) {
                const otherPath = this._getSavePathOnStatus(status);
                const testFilePath = path.join(otherPath, test.cacheFile);
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        }
    }

    /**
     * Adds a test to the collection.
     * @param {CQLTest} test - The test to add.
     */
    add(test) {
        if (test instanceof CQLTest) {
            this.tests.push(test);
        }
    }

    /**
     * Runs all tests.
     * @param {string} apiUrl - The API URL for tests.
     * @param {boolean} [force=false] - Flag indicating whether to force test cache.
     * @returns {Promise<CQLResults>} The results of all tests.
     */
    async run(apiUrl, force = false) {
        const results = new CQLResults();
        for (const test of this.tests) {
            const result = await test.run(apiUrl);
            this._cacheTest(test, result?.testStatus, force);
            results.add(result);
        }
        results.summaryCount();
        return results;
    }
}

module.exports = CQLTests;
