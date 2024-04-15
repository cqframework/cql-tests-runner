#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const xmlParser = require('fast-xml-parser');
const { format } = require('date-fns');
const colors = require('colors/safe');
const currentDate = format(new Date(), 'yyyyMMddhhmm');
const arguments = process.argv.slice(2);

const apiUrl = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';
const data = {
    "resourceType": "Parameters",
    "parameter": [{
        "name": "expression",
        "valueString": "2 + 2"
    }]
};

const requestOptions = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
};

fetch(apiUrl, requestOptions)
  .then(response => {
    if (!response.ok) {
        throw new Error('Network response not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Response:', JSON.stringify(data));
  })
  .catch(error => {
    console.error('Error:', error); 
  });

/*
var directory = '../results'
var collectionString = '../collections/cqf-measures.postman_collection.json';
var environmentString = '../collections/workspace.postman_globals.json';
if(arguments.length > 0){
    arguments.forEach(arg =>{
        var prefix = arg.slice(0,4);
        switch(prefix){
            case '-cs=':
                collectionString = arg.slice(4);
                break;
            case '-es=':
                environmentString = arg.slice(4);
                break;
            case '-op=':
                directory = arg.slice(4);
                break;
        }
    });
}
newman.run({
    collection: require(collectionString),
    environment: require(environmentString)
}).on('beforeDone', (error, data) => {
    if (error) {
        console.log(error);
    }
    var TestingResults = {"Summary":{},"TestDetails":[]}
    var jsonTestTemplate = {"Name": "",
                             "Assertions": []};
    var jsonAssertionTemplate = {"Assertion": "", 
                                "Message": "", 
                                "Result": ""};
    var failCount = 0;
    var passCount = 0;
    var missingCount = 0;
    var totalTestCount = 0;
    var totalAssertionCount = 0;
    
    var passingTests = [];
    var failingTests = [];
    var missingTests = [];

    data.summary.run.executions.forEach(exec => {
        totalTestCount++;
        if (exec.assertions) {
            console.log('Request name:', exec.item.name);
            console.log('Assertions:');
            var addedFail = false;
            var addedPass = false;
            var newJsonTest = JSON.parse(JSON.stringify(jsonTestTemplate));
            newJsonTest.Name = exec.item.name;
            TestingResults.TestDetails.push(newJsonTest);
            exec.assertions.forEach(assert => {
                totalAssertionCount++;
                var newAssertion = JSON.parse(JSON.stringify(jsonAssertionTemplate));
                newAssertion.Assertion = assert.assertion;
                if (assert.error) {
                    console.log('\t', colors.red('FAILED'), ': ', assert.assertion, '\n\t\t  ', colors.yellow(assert.error.message));
                    failCount++;
                    if (!addedFail) {
                        addedFail = true;
                    }
                    newAssertion.Result = 'FAIL';
                    newAssertion.Message = assert.error.message;

                }
                else {
                    console.log('\t', colors.green('PASSED'), ': ', assert.assertion);
                    passCount++;
                    if (!addedPass) {
                        addedPass = true;
                    }
                    newAssertion.Result = 'PASS';
                }
                newJsonTest.Assertions.push(newAssertion);
            });
            if (addedFail) {
                failingTests.push(exec.item.name);
            }
            else {
                passingTests.push(exec.item.name);
            }
        }
        else{
            console.log('Request name:', exec.item.name);
            console.log('\t', colors.red('Missing Assertions'), ': ', exec.item.name);
            missingCount++;
            missingTests.push(exec.item.name);
        }
    });

    console.log('\n\nSUMMARY\n');
    console.log('Assertions that passed: ', colors.green(passCount));
    console.log('Assertions that failed: ', colors.red(failCount));
    console.log('Total assertions: ', totalAssertionCount);
    console.log('Tests that are missing assertions: ', colors.red(missingCount));
    console.log('Total tests: ', totalTestCount);
    
    TestingResults.Summary['PassingAssertionsCount'] = passCount;
    TestingResults.Summary['FailingAssertionsCount'] = failCount;
    TestingResults.Summary['TotalAssertionCount'] = totalAssertionCount;
    TestingResults.Summary['MissingAssertionsCount'] = missingCount;

    console.log('Tests that passed');
    passingTests.forEach(passTest => {
        console.log('\t', colors.green(passTest));
    });
    TestingResults.Summary['TotalTests'] = totalTestCount;
    TestingResults.Summary['PassingTests'] = passingTests;

    console.log('Tests with failing assertions');
    failingTests.forEach(failTest => {
        console.log('\t', colors.red(failTest));
    });
    TestingResults.Summary['FailingTests'] = failingTests;

    console.log('Tests with missing assertions');
    missingTests.forEach(missingTest => {
        console.log('\t', colors.yellow(missingTest));
    });
    TestingResults.Summary['TestsMissingAssertions'] = missingTests;

    var fileName = `testResults_${currentDate}.json`

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
     var testResults = {"TestingResults": TestingResults};
//     testResults['Tests'] = TestingResults;

    var  filePath = path.join(directory, fileName);
    fs.writeFile(filePath, JSON.stringify(testResults, null, 2), (error)=>{
        if(error) throw error;
    });
}); 
*/