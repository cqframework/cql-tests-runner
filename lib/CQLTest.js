const fs = require('fs');
const path = require('path');
const axios = require('axios');
const CQLTestResult = require('./CQLTestResult');
const crypto = require('crypto');

/**
 * Represents a CQL Test.
 */
class CQLTest {
    /**
     * Enum representing possible test statuses.
     * @enum {string}
     */
    static STATUS = {
        'PASS': 'pass',
        'FAIL': 'fail',
        'SKIP': 'skip',
        'ERROR': 'error',
    }

    /**
     * Creates an instance of CQLTest.
     * @param {string} tests - The type of test.
     * @param {string} group - The group of test.
     * @param {object} test - The test details.
     */
    constructor(tests, group, test) {
        /**
         * Configuration object for the test.
         * @type {object}
         */
        this.config = {};
        if (tests && group && test) {
            this.config = {
                tests,
                group,
                test,
                options: {}
            }
            this._prepareTest();
        }
    }

    /**
     * Loads configuration for the test.
     * @param {object} config - The configuration object.
     */
    loadConfig(config) {
        let { checksum, ...restConfig } = config;
        if (checksum) {
            let calculatedChecksum = CQLTest.generateCheckSum(restConfig);
            if (calculatedChecksum === checksum) {
                this.config = config;
                this.prepared = true;
                this.cacheFile = `${this.id}.json`;
            } else {
                throw new Error(`Loading configuration failed due to a mismatched checksum.`);
            }
        } else {
            throw new Error(`Loading configuration failed due to a missing checksum.`);
        }
        return this;
    }

    get id(){
        return this.config?.id ?? null;
    }

    /**
     * Prepares the test configuration.
     * @private
     */
    _prepareTest() {
        this.config['name'] = this.config.test.name;
        this.config.id = `${this.config.tests}_${this.config.group}_${this.config.name}`;
        if (typeof this.config.test?.expression !== 'string') {
            this.config['invalid'] = this.config.test.expression.invalid;
            this.config['expression'] = this.config.test.expression.text;
        }
        else {
            this.config['invalid'] = 'false';
            this.config['expression'] = this.config.test.expression;
        }

        if (this.config.test.output !== undefined) {
            if (typeof this.config.test.output !== 'string') {
                // @todo: Structure the result if it can be structured (i.e. is one of the expected types)
                this.config['expected'] = this.config.test.output.text;
            }
            else {
                this.config['expected'] = this.config.test.output;
            }
        }
        else {
            this.status = CQLTest.STATUS.SKIP;
        }
        this.config['checksum'] = CQLTest.generateCheckSum(this.config);
        this.cacheFile = `${this.id}.json`;
        this.prepared = true;
    }

    /**
     * Saves the test configuration to a file.
     * @param {string} directory - The directory to save the file.
     * @returns {string|null} - The file save path, or null if directory is not provided.
     */
    save(directory, force = false) {
        let fileSavePath = null;
        if (directory && this.id) {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            fileSavePath = path.join(directory, this.cacheFile);
            if (!fs.existsSync(fileSavePath) || force) {
                fs.writeFileSync(fileSavePath, JSON.stringify(this,0,4));
            }
        }
        return fileSavePath;
    }

    /**
     * Runs the test.
     * @param {string} apiUrl - The API URL to run the test against.
     * @returns {Promise<CQLTestResult>} - The result of the test.
     */
    async run(apiUrl) {
        if (this.prepared) {
            let result = new CQLTestResult(this?.status ?? CQLTest.STATUS.FAIL, null);
            result.testsName = this.config.tests;
            result.testName = this.config.name;
            result.groupName = this.config.group;
            result.expected = this.config?.expected;
            result.invalid = this.config.invalid;

            try {
                console.log('Running test %s:%s:%s', this.config.tests, this.config.group, this.config.name);

                const data = {
                    "resourceType": "Parameters",
                    "parameter": [{
                        "name": "expression",
                        "valueString": this.config.expression
                    }]
                };

                const response = await axios.post(apiUrl, data, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                result.responseStatus = response.status;

                const responseBody = response.data;
                result.actual = CQLTestResult.compute(responseBody);

                if (response.status === 200) {
                    if (['true', 'semantic'].includes(this.config.invalid)) {
                        result.testStatus = CQLTest.STATUS.PASS;
                    } else if (this.config?.expected === result.actual) {
                        result.testStatus = CQLTest.STATUS.PASS;
                    }
                }
            }
            catch (error) {
                result.testStatus = CQLTest.STATUS.ERROR;
                result.error = error;
            }
            finally {
                console.log('Test %s:%s:%s status: %s expected: %s actual: %s', this.config.tests, this.config.group, this.config.name, result.testStatus, this.config.expected, result.actual);
            }
            return result;
        } else {
            throw new Error(`A valid test configuration was not found. Unable to execute the test.`)
        }

    }

    /**
     * Returns the JSON representation of the test.
     * @returns {object} - The JSON representation of the test.
     */
    toJSON() {
        return this.config;
    }

    /**
     * Generates a checksum for the given configuration.
     * @param {object} config - The configuration object.
     * @returns {string} - The checksum.
     */
    static generateCheckSum(config) {
        return crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex').toString();
    }

    /**
     * Creates a CQLTest instance from a JSON configuration.
     * @param {object} config - The JSON configuration.
     * @returns {CQLTest} - The CQLTest instance.
     */
    static fromJSON(config) {
        return new CQLTest().loadConfig(config);
    }
}

module.exports = CQLTest;
