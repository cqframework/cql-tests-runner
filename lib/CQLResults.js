const fs = require('fs');
const path = require('path');
const CQLTestResult = require('./CQLTestResult');
const { format } = require('date-fns');
const currentDate = format(new Date(), 'yyyyMMddhhmm');

/**
 * Represents the results of running CQL tests.
 */
class CQLResults {
    /**
     * Initializes CQLResults object with counts and results array.
     */
    constructor() {
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
        /**
         * @type {Array} results - Array containing CQLTestResult objects.
         */
        this.results = [];
    }

    /**
     * Adds a test result to the counts and results array.
     * @param {CQLTestResult} result - The test result to add.
     */
    add(result) {
        if (result instanceof CQLTestResult) {
            this.counts[result.testStatus]++;
            this.results.push(result);
        }
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
     * Converts CQLResults object to JSON format.
     * @returns {Object} JSON representation of CQLResults.
     */
    toJSON() {
        return {
            summary: this.counts,
            results: this.results
        };
    }

    /**
     * Saves the CQLResults object to a JSON file.
     * @param {string} outputPath - The directory path where the file will be saved.
     * @returns {string} The path of the saved file.
     */
    save(outputPath) {
        const fileName = `${currentDate}_results.json`; // File name based on current date
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true }); // Create directory if not exists
        }
        const filePath = path.join(outputPath, fileName); // Construct full file path
        fs.writeFileSync(filePath, JSON.stringify(this, null, 2)); // Write JSON to file
        console.log(`Results saved to: ${filePath}`); // Log file path
        return filePath; // Return file path
    }
}

module.exports = CQLResults;