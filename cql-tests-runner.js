#!/usr/bin/node

const os = require('os');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const loadTests = require('./loadTests');
const colors = require('colors/safe');
const currentDate = format(new Date(), 'yyyyMMddhhmm');
const axios = require('axios');
const CQLEngine = require('./CQLEngine');
// TODO: Read server-url from environment path...

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

// Iterate through tests
async function main() {
    const args = process.argv.slice(2);
    let apiUrl = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';
    let cqlEngine = new CQLEngine(apiUrl);
    cqlEngine.cqlVersion = '1.5';

    let environmentPath = './environment/globals.json';
    let outputPath = './results'
    if (args.length > 0) {
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
            }
        };
    }

    const tests = loadTests.load();

    var x;
    await require('./cvl/cvlLoader.js').then(([{ default: cvl }]) => { x = cvl });

    // Set this to true to run only the first group of tests
    const quickTest = false;
    //const onlyTestsName = "CqlArithmeticFunctionsTest";
    //const onlyGroupName = "Ceiling";
    //const onlyTestName = "CeilingNeg1D1";

    let results = [];
    let groupResults = [];
    for (const ts of tests) {
        if (typeof onlyTestsName === 'undefined' || onlyTestsName === ts.name) {
            console.log('Tests: ' + ts.name);
            let groupTests = [];
            for (const group of ts.group) {
                if (typeof onlyGroupName === 'undefined' || onlyGroupName === group.name) {
                    console.log('    Group: ' + group.name);
                    let test = group.test;
                    if (test != undefined) {
                        for (const t of test) {
                            if (typeof onlyTestName === 'undefined' || onlyTestName === t.name) {
                                console.log('        Test: ' + t.name);
                                var r = new Result(ts.name, group.name, t);
                                results.push(r);
                                groupTests.push(r);
                            }
                        }
                    }
                    if (quickTest) {
                        break; // Only load 1 group for testing
                    }
                }
            }
            groupResults.push(groupTests);

            if (quickTest) {
                break; // Only load 1 test set for testing
            }
        }
    }

    for (let g of groupResults) {
        await runGroupTest(g, apiUrl, x);
    }

    /*
    for (let r of results) {
        await runTest(r, cqlEngine.apiUrl, x);
    }
    */

    logResults(cqlEngine, results, outputPath);
};

main();

async function runGroupTest(group, apiUrl, cvl) {
    var testsName = '';
    var body = '';
    for (let r of group) {
        if (testsName === '') {
            testsName = r.testsName;
        }
        // TODO: Build a separate library for invalid semantic tests?
        if (r.invalid !== 'semantic') {
            body += 'define "' + r.groupName + '.' + r.testName + '": ' + r.expression + os.EOL + os.EOL;
        }
    }

    var body = 'library ' + testsName + os.EOL + os.EOL + body;

    const cqlOutputPath = './cql';
    if (!fs.existsSync(cqlOutputPath)) {
        fs.mkdirSync(cqlOutputPath, { recursive: true });
    }

    const fileName = testsName + '.cql';
    const filePath = path.join(cqlOutputPath, fileName);
    fs.writeFileSync(filePath, body, (error) => {
        if (error) throw error;
    });
}

async function runTest(result, apiUrl, cvl) {
    if (result.testStatus !== 'skip') {
        const data = {
            "resourceType": "Parameters",
            "parameter": [{
                "name": "expression",
                "valueString": result.expression
            }]
        };

        try {
            console.log('Running test %s:%s:%s', result.testsName, result.groupName, result.testName);
            const response = await axios.post(apiUrl, data, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            result.responseStatus = response.status;

            const responseBody = response.data;
            result.actual = extractResult(responseBody);

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
            result.error = error;
        };
    }

    console.log('Test %s:%s:%s status: %s expected: %s actual: %s', result.testsName, result.groupName, result.name, result.testStatus, result.expected, result.actual);
    return result;
};

function resultsEqual(expected, actual) {
    if (expected === undefined && actual === undefined) {
        return true;
    }
    else if (typeof expected === 'number') {
        return Math.abs(actual - expected) < 0.00000001;
    }
    else {
        return expected === actual
    }
}

function extractResult(response) {
    var result;
    if (response.hasOwnProperty('resourceType') && response.resourceType === 'Parameters') {
        for (let p of response.parameter) {
            if (p.name === 'return') {
                if (result === undefined) {
                    if (p.hasOwnProperty("valueBoolean")) {
                        result = p.valueBoolean;
                    }
                    else if (p.hasOwnProperty("valueInteger")) {
                        result = p.valueInteger;
                    }
                    else if (p.hasOwnProperty("valueString")) {
                        result = p.valueString;
                    }
                    else if (p.hasOwnProperty("valueDecimal")) {
                        result = p.valueDecimal;
                    }
                    else if (p.hasOwnProperty("valueDate")) {
                        result = '@' + p.valueDate.toString();
                    }
                    else if (p.hasOwnProperty("valueDateTime")) {
                        result = '@' + p.valueDateTime.toString();
                        if (result.length <= 10) {
                            result = result + 'T';
                        }
                    }
                    else if (p.hasOwnProperty("valueTime")) {
                        result = '@T' + p.valueTime.toString();
                    }
                    else if (p.hasOwnProperty("valueQuantity")) {
                        result = { value: p.valueQuantity.value, unit: p.valueQuantity.code };
                    }
                    else {
                        result = null;
                    }
                    // TODO: Handle other types: Period, Range, Ratio, code, Coding, CodeableConcept
                }
                else {
                    // TODO: Handle lists
                    // TODO: Handle tuples
                    result = undefined;
                    break;
                }
            }
        }

        if (result !== undefined) {
            return result;
        }
    }

    // Anything that can't be structured directly, return as the actual output...
    return JSON.stringify(response);
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
    if(cqlengine instanceof CQLEngine){
        const fileName = `${currentDate}_results.json`;
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }
        const filePath = path.join(outputPath, fileName);
        const result = {
            cqlengine,
            summary: summarizeResults(results),
            results: results
        };
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