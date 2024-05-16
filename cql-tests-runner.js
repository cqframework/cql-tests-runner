#!/usr/bin/node

const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');
const loadTests = require('./loadTests');
const CQLTest = require('./lib/CQLTest');
const CQLTests = require('./lib/CQLTests');

/**
 * Loads tests from cache based on test status.
 * @param {string} tmpPath - Path to the temporary directory.
 * @param {Array<string>} testStatus - Array of test statuses.
 * @returns {Promise<CQLTests>} - A promise resolving to CQLTests instance.
 */
async function loadTestsFromCache(tmpPath, testStatus) {
    let preparedTests = new CQLTests(tmpPath);
    for (const status of testStatus) {
        const testListByStatusPath = path.join(tmpPath, CQLTests.CACHE_DIR, status);
        if (fs.existsSync(testListByStatusPath)) {
            const testList = fs.readdirSync(testListByStatusPath);
            for (const testCachedFile of testList) {
                const testData = fs.readFileSync(path.join(testListByStatusPath, testCachedFile));
                const testInstance = CQLTest.fromJSON(JSON.parse(testData));
                preparedTests.add(testInstance);
            }
        }
    }
    return preparedTests;
}

/**
 * Loads all tests.
 * @param {string} tmpPath - Path to the temporary directory.
 * @param {boolean} quickTest - Whether to load only one group for testing.
 * @returns {Promise<CQLTests>} - A promise resolving to CQLTests instance.
 */
async function loadAllTests(tmpPath, quickTest) {
    const preparedTests = new CQLTests(tmpPath);
    const tests = loadTests.load();
    for (const ts of tests) {
        // console.log('Tests: ' + ts.name);
        for (const group of ts.group) {
            // console.log('    Group: ' + group.name);
            const test = group.test;
            if (test != undefined) {
                for (const t of test) {
                    // console.log('        Test: ' + t.name);
                    preparedTests.add(new CQLTest(ts.name, group.name, t));
                }
            }
            if (quickTest) break; // Only load 1 group for testing
        }
        if (quickTest) break; // Only load 1 test set for testing
    }
    return preparedTests;
}


const DEFAULT_API_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';
const DEFAULT_ENVIRONMENT_PATH = './environment/globals.json';
const DEFAULT_OUTPUT_PATH = './results';
const DEFAULT_TMP_PATH = './tmp';
/**
 * Main function to execute the CQL test runner.
 */
async function main() {
    let validTestStautsList = Object.values(CQLTest.STATUS);
    const args = process.argv.slice(2);
    let apiUrl = DEFAULT_API_URL;
    let environmentPath = DEFAULT_ENVIRONMENT_PATH;
    let outputPath = DEFAULT_OUTPUT_PATH;
    let tmpPath = DEFAULT_TMP_PATH;
    let testStatus = [];

    for (const arg of args) {
        let prefix = arg.slice(0, 4);
        switch (prefix) {
            case '-au=':
                apiUrl = arg.slice(4);
                break;
            case '-ep=':
                environmentPath = arg.slice(4);
                break;
            case '-op=':
                outputPath = arg.slice(4);
                break;
            case '-status=':
                let testWithStatus = arg.slice(4);
                testStatus = testWithStatus.split(',').filter((value) => (
                    validTestStautsList.includes(value)
                ));
                if (testStatus.length === 0) {
                    console.log(`Valid list of test status not passed. CQL Test Runner will run the tests!`);
                }
                break;
        }
    }

    let preparedTests;

    if (testStatus.length > 0 && fs.existsSync(tmpPath)) {
        console.log(`Running following tests with status - ${testStatus}`);
        preparedTests = await loadTestsFromCache(tmpPath, testStatus);
    } else {
        console.log(`Running all tests!!`);
        const quickTest = true;
        preparedTests = await loadAllTests(tmpPath, quickTest);
    }

    let results = await preparedTests.run(apiUrl);
    results.save(outputPath);
}

main().catch(err => {
    console.error('Error:', err);
});
