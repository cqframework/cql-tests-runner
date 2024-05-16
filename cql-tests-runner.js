#!/usr/bin/node

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

    // Set this to true to run only the first group of tests
    const quickTest = true;

    let results = [];
    for (const ts of tests) {
        console.log('Tests: ' + ts.name);
        for (const group of ts.group) {
            console.log('    Group: ' + group.name);
            let test = group.test;
            if (test != undefined) {
                for (const t of test) {
                    console.log('        Test: ' + t.name);
                    results.push(new Result(ts.name, group.name, t));
                }
            }
            if (quickTest) {
                break; // Only load 1 group for testing
            }
        }
        if (quickTest) {
            break; // Only load 1 test set for testing
        }
    }

    for (let r of results) {
        await runTest(r, cqlEngine.apiUrl);
    }

    logResults(cqlEngine, results, outputPath);
};

main();

async function runTest(result, apiUrl) {
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
                    result.testStatus = result.expected === result.actual ? 'pass' : 'fail';
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


function extractResult(response) {
    var result;
    if (response.hasOwnProperty('resourceType') && response.resourceType === 'Parameters') {
        for (let p of response.parameter) {
            if (p.name === 'return') {
                if (result === undefined) {
                    if (p.hasOwnProperty("valueBoolean")) {
                        result = p.valueBoolean.toString();
                    }
                    else if (p.hasOwnProperty("valueInteger")) {
                        result = p.valueInteger.toString();
                    }
                    else if (p.hasOwnProperty("valueString")) {
                        result = p.valueString;
                    }
                    else if (p.hasOwnProperty("valueDecimal")) {
                        result = p.valueDecimal;
                    }
                    else if (p.hasOwnProperty("valueDate")) {
                        result = p.valueDate;
                    }
                    else if (p.hasOwnProperty("valueDateTime")) {
                        result = p.valueDateTime;
                    }
                    else if (p.hasOwnProperty("valueTime")) {
                        result = p.valueTime;
                    }
                    else if (p.hasOwnProperty("valueQuantity")) {
                        result = p.valueQuantity.value.toString() + " '" + p.valueQuantity.code + "'";
                    }

                    // Any other type isn't handled yet...
                }
                else {
                    // Can't handle list-valued results yet...
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