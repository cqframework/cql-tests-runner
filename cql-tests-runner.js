#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const loadTests = require('./loadTests');
const colors = require('colors/safe');
const currentDate = format(new Date(), 'yyyyMMddhhmm');
const axios = require('axios');
const CQLEngine = require('./lib/cql-engine/CQLEngine.js');
const ConfigLoader = require('./configLoader');
const config = new ConfigLoader();
const resultsShared = require('./resultsShared');
// const TestResults = require('./lib/test-results/TestResults.js');
const CQLTestResults = require('./lib/test-results/CQLTestResults.js');

const BooleanExtractor = require('./lib/extractors/value-type-extractors/BooleanExtractor');
const CodeExtractor = require('./lib/extractors/value-type-extractors/CodeExtractor.js');
const ConceptExtractor = require('./lib/extractors/value-type-extractors/ConceptExtractor');
const DateExtractor = require('./lib/extractors/value-type-extractors/DateExtractor');
const DateTimeExtractor = require('./lib/extractors/value-type-extractors/DateTimeExtractor');
const DecimalExtractor = require('./lib/extractors/value-type-extractors/DecimalExtractor');
const EvaluationErrorExtractor = require('./lib/extractors/EvaluationErrorExtractor');
const IntegerExtractor = require('./lib/extractors/value-type-extractors/IntegerExtractor');
const NullEmptyExtractor = require('./lib/extractors/NullEmptyExtractor');
const PeriodExtractor = require('./lib/extractors/value-type-extractors/DateTimeIntervalExtractor.js');
const QuantityExtractor = require('./lib/extractors/value-type-extractors/QuantityExtractor');
const RangeExtractor = require('./lib/extractors/value-type-extractors/QuantityIntervalExtractor.js');
const RatioExtractor = require('./lib/extractors/value-type-extractors/RatioExtractor');
const StringExtractor = require('./lib/extractors/value-type-extractors/StringExtractor');
const TimeExtractor = require('./lib/extractors/value-type-extractors/TimeExtractor');
const UndefinedExtractor = require('./lib/extractors/UndefinedExtractor');
const ResultExtractor = require('./lib/extractors/ResultExtractor.js');
const { group } = require('console');


// Setup for running both $cql and Library/$evaluate
// Expand outputType to allow Parameters representation

// Test Container Structure:
/*
class Tests {
    name: String
    version: String // The version in which the capability being tested was introduced
    description: String
    reference: String // A reference to the section of the spec being tested
    notes: String
    group: TestGroup[]
}

class TestGroup {
    name: String
    version: String // The version in which the capability being tested was introduced
    description: String
    reference: String // A reference to the section of the spec being tested
    notes: String
    test: Test[]
}

class Test {
    name: String
    version: String // The version in which the capability being tested was introduced
    description: String
    reference: String // A reference to the section of the spec being tested
    inputFile: String // Input data, if any
    predicate: Boolean // True if this test represents a predicate
    mode: String // strict | loose
    ordered: Boolean // Whether the results are expected to be ordered, false if not present
    checkOrderedFunctions: Boolean // Whether to ensure that attempting to use ordered functions with an unordered input should throw (e.g., using .skip() on an unordered list)
    expression: String | { text: String, invalid: false, semantic, true }
    output: String([]) | { text: String, type: boolean | code | date | dateTime | decimal | integer | long | quantity | string | time }([])
}
*/
class Result {
    testStatus; // String: pass | fail | skip | error
    responseStatus; // Integer
    actual; // String
    expected; // String
    error; // Error
    constructor(testsName, groupName, test) {
        this.testsName = testsName;
        this.groupName = groupName;
        this.testName = test.name;

        if (typeof test.expression !== 'string') {
            this.invalid = test.expression.invalid;
            this.expression = test.expression.text;
        }
        else {
            this.invalid = 'false';
            this.expression = test.expression;
        }

        if (test.output !== undefined) {
            if (typeof test.output !== 'string') {
                // TODO: Structure the result if it can be structured (i.e. is one of the expected types)
                this.expected = test.output.text;
            }
            else {
                this.expected = test.output;
            }
        }
        else {
            this.testStatus = 'skip';
        }
    }
}

function buildExtractor() {
    let extractors = new EvaluationErrorExtractor();
        extractors
            .setNextExtractor(new NullEmptyExtractor())
            .setNextExtractor(new UndefinedExtractor())
            .setNextExtractor(new StringExtractor())
            .setNextExtractor(new BooleanExtractor())
            .setNextExtractor(new IntegerExtractor())
            .setNextExtractor(new DecimalExtractor())
            .setNextExtractor(new DateExtractor())
            .setNextExtractor(new DateTimeExtractor())
            .setNextExtractor(new TimeExtractor())
            .setNextExtractor(new QuantityExtractor())
            .setNextExtractor(new RatioExtractor())
            .setNextExtractor(new PeriodExtractor())
            .setNextExtractor(new RangeExtractor())
            .setNextExtractor(new CodeExtractor())
            .setNextExtractor(new ConceptExtractor());
    return new ResultExtractor(extractors);
}

// Iterate through tests
async function main() {

    let serverBaseUrl = config.FhirServer.BaseUrl
    let cqlEndpoint = config.CqlEndpoint;
    let outputPath = config.Tests.ResultsPath;

    //TODO: CQLEngine needs adjustments to handle Library/$evaluate. Config forces use of proper operation name and baseURL
    let cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = '1.5'; //default value
    const cqlVersion = config?.Build?.CqlVersion;
    if (typeof cqlVersion === 'string' && obj.cqlVersion.trim() !== '') {
        cqlEngine.cqlVersion = cqlVersion;
    }

    var x;
    await require('./cvl/cvlLoader.js').then(([{ default: cvl }]) => { x = cvl });

    const tests = loadTests.load();
    // Set this to true to run only the first group of tests
    const quickTest = config.Debug.QuickTest

    var resultExtractor = buildExtractor();

    const emptyResults = await resultsShared.generateEmptyResults(tests, quickTest);
    const skipMap = config.skipListMap();
    let results = new CQLTestResults(cqlEngine);
    for (let testFile of emptyResults) {
        for (let result of testFile) {
            if(shouldSkipVersionTest(cqlEngine, result)){
                //add to skipMap
                const skipReason = "test version " + result.testVersion + " not applicable to engine version " + cqlEngine.cqlVersion;
                addToSkipList(skipMap, tests[0].name, tests[0].group[0].name, result.testName, skipReason);
            }
            await runTest(result, cqlEngine.apiUrl, x, resultExtractor, skipMap);
            results.add(result);
        }
    }
    results.save(outputPath);
    results.validate();
};

function addToSkipList(skipMap, testsName, groupName, testName, reason){
    skipMap.set( `${testsName}-${groupName}-${testName}`, reason);
}

main();

function compareVersions(versionA, versionB) {
    // Split into numeric parts (e.g., "1.5.2" → [1,5,2])
    const partsA = String(versionA ?? '').trim().split('.').map(n => parseInt(n, 10) || 0);
    const partsB = String(versionB ?? '').trim().split('.').map(n => parseInt(n, 10) || 0);

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
        const numA = partsA[i] ?? 0;
        const numB = partsB[i] ?? 0;

        if (numA !== numB) {
            return numA < numB ? -1 : 1; // -1 if A < B, 1 if A > B
        }
    }
    return 0; // versions are equal
}

function shouldSkipVersionTest(cqlEngine, result) {
    const engineVersion = cqlEngine?.cqlVersion;
    if (!engineVersion) return false; // no version to compare against
    // Rule 1: if test.version is set, engine must be >= test.version
    if (result.testVersion && compareVersions(engineVersion, result.testVersion) < 0) {
        return true;
    }
    // Rule 2: if test.versionTo is set, engine must be <= test.versionTo
    if (result.testVersionTo && compareVersions(engineVersion, result.testVersionTo) > 0) {
        return true;
    }
    return false; // passes all checks
}

async function runTest(result, apiUrl, cvl, resultExtractor, skipMap) {
    const key = `${result.testsName}-${result.groupName}-${result.testName}`;
    if (result.testStatus === 'skip') {
        result.SkipMessage = 'Skipped by cql-tests-runner';
        return result;
    } else if (skipMap.has(key)) {
        let reason = skipMap.get(key);
        result.SkipMessage = `Skipped by config: ${reason}"`;
        result.testStatus = 'skip';
        return result;
    }
    //TODO: handle instance api location for library/$evaluate
    let data = resultsShared.generateParametersResource(result, config.FhirServer.CqlOperation);

    try {
        console.log('Running test %s:%s:%s', result.testsName, result.groupName, result.testName);
        const response = await axios.post(apiUrl, data, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        result.responseStatus = response.status;

        const responseBody = response.data;
        result.actual = resultExtractor.extract(responseBody);
        const invalid = result.invalid;
        if (invalid === 'true' || invalid === 'semantic') {
            // TODO: Validate the error message is as expected...
            result.testStatus = response.status === 200 ? 'fail' : 'pass';
        }
        else {
            if (response.status === 200) {
                result.testStatus = resultsEqual(cvl.parse(result.expected), result.actual) ? 'pass' : 'fail';
            }
            else {
                result.testStatus = 'fail';
            }
        }
    }
    catch (error) {
        result.testStatus = 'error';
        result.error = {message: error.message, stack: error.stack};
    };

    console.log('Test %s:%s:%s status: %s expected: %s actual: %s', result.testsName, result.groupName, result.testName, result.testStatus, result.expected, result.actual);
    return result;
};

function resultsEqual(expected, actual) {
    if (expected === undefined && actual === undefined) {
        return true;
    }

    if (expected === null && actual === null) {
        return true;
    }

    if (typeof expected === 'number') {
        return Math.abs(actual - expected) < 0.00000001;
    }

    if (expected === actual) {
        return true;
    }

    if (typeof expected !== 'object' || expected === null || typeof actual !== 'object' || actual === null) {
        return false;
    }

    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);

    if (expectedKeys.length !== actualKeys.length) return false;

    for (const key of expectedKeys) {
        if (!actualKeys.includes(key) || !resultsEqual(expected[key], actual[key])) {
            return false;
        }
    }

    return true;
}

// Output test results

function logResult(result, outputPath) {
    const fileName = `${result.testsName}_${result.groupName}_${result.testName}_${currentDate}_results.json`;
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    const filePath = path.join(outputPath, fileName);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), (error) => {
        if (error) throw error;
    });
}

function logResults(cqlengine, results, outputPath) {
    if (cqlengine instanceof CQLEngine) {
        const fileName = `${currentDate}_results.json`;
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }
        const filePath = path.join(outputPath, fileName);
        const result = new TestResults(cqlengine, summarizeResults(results), null, results);
        fs.writeFileSync(filePath, JSON.stringify(result, null, 2), (error) => {
            if (error) throw error;
        });
    } else {
        throw new Error(`Not a valid CQL Engine Instance !!`)
    }

}

function summarizeResults(results) {
    let passCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let errorCount = 0;
    for (let r of results) {
        if (r.testStatus === 'pass') {
            passCount++;
        }
        else if (r.testStatus === 'skip') {
            skipCount++;
        }
        else if (r.testStatus === 'fail') {
            failCount++;
        }
        else if (r.testStatus === 'error') {
            errorCount++;
        }
    }
    console.log("pass: %d skip: %d fail: %d error: %d", passCount, skipCount, failCount, errorCount);

    return {
        pass: passCount,
        skip: skipCount,
        fail: failCount,
        error: errorCount
    }
}
