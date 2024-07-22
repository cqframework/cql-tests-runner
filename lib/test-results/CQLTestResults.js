const fs = require('fs');
const path = require('path');
const CQLEngine = require('../cql-engine/CQLEngine');
const cqlTestResultSchema = require('../schema/cql-test-results.schema.json');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Represents the results of running CQL tests.
 */
class CQLTestResults {
    /**
     * Initializes CQLTestResults object with counts and results array.
     * @param {CQLEngine} cqlengine - The CQL engine instance used to run the tests.
     * @param {Date} [testsRunDateTime=null] - The date and time when the tests were run.
     * @throws {Error} If cqlengine is not an instance of CQLEngine.
     */
    constructor(cqlengine, testsRunDateTime = null) {
        /**
         * @type {Object} counts - Object containing counts of test statuses.
         * @property {number} pass - Number of passed tests.
         * @property {number} skip - Number of skipped tests.
         * @property {number} fail - Number of failed tests.
         * @property {number} error - Number of tests with errors.
         */
        this.counts = {
            pass: 0,
            skip: 0,
            fail: 0,
            error: 0
        };
        if (!(cqlengine instanceof CQLEngine)) {
            throw new Error('Invalid CQLEngine Instance');
        }
        this._cqlengine = cqlengine;
        this._testsRunDateTime = testsRunDateTime || new Date();
        /**
         * @type {Array<Object>} results - Array containing CQLTestResult objects.
         */
        this.results = [];
    }

    /**
     * Adds a test result to the counts and results array.
     * @param {Object} result - The test result to add.
     * @param {string} result.testStatus - The status of the test (pass, skip, fail, error).
     */
    add(result) {
        this.counts[result.testStatus]++;
        this.results.push(result);
    }

    /**
     * Displays the summary of test counts.
     * @returns {Object} The counts object.
     */
    summaryCount() {
        console.log(`pass: ${this.counts.pass} skip: ${this.counts.skip} fail: ${this.counts.fail} error: ${this.counts.error}`);
        return this.counts;
    }

    /**
     * Summarizes the test results and updates counts accordingly.
     * @returns {Object} The counts object.
     */
    summarize() {
        this.counts = {
            pass: 0,
            skip: 0,
            fail: 0,
            error: 0
        };

        for (const result of this.results) {
            this.counts[result.testStatus]++;
        }

        return this.summaryCount();
    }

    /**
     * Converts CQLTestResults object to JSON format.
     * @returns {Object} JSON representation of CQLTestResults.
     */
    toJSON() {
        return {
            cqlengine: this._cqlengine,
            testsRunDateTime: this._testsRunDateTime,
            testResultsSummary: {
                passCount: this.counts.pass,
                skipCount: this.counts.skip,
                failCount: this.counts.fail,
                errorCount: this.counts.error
            },
            results: this.results
        };
    }

    /**
     * Formats a date into a string in the format yyyyMMddhhmm.
     * @param {Date} date - The date to format.
     * @returns {string} The formatted date string.
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}${month}${day}${hours}${minutes}`;
    }

    /**
     * Saves the CQLTestResults object to a JSON file.
     * @param {string} outputPath - The directory path where the file will be saved.
     * @param {string} [filename=null] - The name of the file (without extension).
     * @returns {string} The path of the saved file.
     */
    save(outputPath, filename = null) {
        filename = filename || `${this.formatDate(new Date())}_results`;
        const fileName = `${filename}.json`;
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, JSON.stringify(this, null, 2));
        console.log(`Results saved to: ${filePath}`);
        return filePath;
    }

    /**
     * Validates the CQLTestResults object against the JSON schema.
     * @returns {boolean} True if the object is valid, otherwise false.
     */
    validate() {
        return CQLTestResults.validateSchema(JSON.parse(JSON.stringify(this, null, 2)));
    }

    /**
     * Validates a data object against the CQL test results schema.
     * @param {Object} data - The data object to validate.
     * @returns {boolean} True if the data is valid, otherwise false.
     */
    static validateSchema(data) {
        const ajv = new Ajv();
        addFormats(ajv);
        const validate = ajv.compile(cqlTestResultSchema);

        const valid = validate(data);
        if (valid) {
            console.log("JSON is valid");
            return true;
        } else {
            console.log("JSON is invalid:", validate.errors);
            return false;
        }
    }
}

module.exports = CQLTestResults;
