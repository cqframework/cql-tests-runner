#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const loadTests = require('./loadTests');
const colors = require('colors/safe');
const currentDate = format(new Date(), 'yyyyMMddhhmm');
const arguments = process.argv.slice(2);

// Environment

var apiUrl = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';
var environmentPath = './environment/globals.json';
var outputPath = './results'
if (arguments.length > 0) {
    arguments.forEach(arg => {
        var prefix = arg.slice(0, 4);
        switch(prefix) {
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
    });
}

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

        // TODO: Turn these into Parameters outputs?
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

// Test Setup
results = [];
loadTests.tests.forEach(testSet => {
    console.log('Container: ' + testSet.name);
    testSet.group.forEach(group => {
        console.log('    Group: ' + group.name);
        // TODO: Set up Library Tests here...
        // results[results.length] = libraryTest(group)
        if (group.test != null) {
            group.test.forEach(test => {
                console.log('        Test: ' + test.name);
                results[results.length] = new Result(testSet.name, group.name, test);
            });
        };
    });
});

// Iterate through tests
async function main() {
    for (let index = 0; index < results.length; index++) {
        await runTest(results[index]);
    }
    logResults();
};

main();

async function runTest(result) {
    if (result.testStatus !== 'skip') {
        const data = {
            "resourceType": "Parameters",
            "parameter": [{
                "name": "expression",
                "valueString": result.expression
            }]
        };
        
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        };
        
        try {
            console.log('Running test ' + result.testsName + ':' + result.groupName + ':' + result.name);
            const response = await fetch(apiUrl, requestOptions);

            result.responseStatus = response.status;

            const responseBody = await response.json();
            result.actual = JSON.stringify(responseBody);

            if (invalid === 'true' || invalid === 'semantic') {
                // TODO: Validate the error message is as expected...
                result.testStatus = response.ok ? 'fail' : 'pass';
            }
            else {
                result.testStatus = response.ok ? 'pass' : 'fail';
            }
        }
        catch (error) {
            result.testStatus = 'error';
            result.error = error;
        };
    }

    console.log('Test ' + result.testsName + ':' + result.groupName + ':' + result.name + ' status: ' + result.testStatus);
    return result;
};

// Output test results

function logResult(result) {
    var fileName = `${result.testsName}_${result.groupName}_${result.testName}_${currentDate}_results.json`;
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    var filePath = path.join(outputPath, fileName);
    fs.writeFile(filePath, JSON.stringify(result, null, 2), (error) => {
        if (error) throw error;
    });
}

function logResults() {
    var fileName = `${currentDate}_results.json`;
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    var filePath = path.join(outputPath, fileName);
    const result = { results: results };
    fs.writeFile(filePath, JSON.stringify(result, null, 2), (error) => {
        if (error) throw error;
    });
}
