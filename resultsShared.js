
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
        this.testVersion = test.version;
        this.testVersionTo = test.versionTo;

        if (typeof test.expression !== 'string') {
            if(test.expression === undefined){
                this.invalid = "undefined";
                this.expression = "undefined";
            }else {
                this.invalid = test.expression.invalid;
                this.expression = test.expression.text;
            }
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


async function generateEmptyResults(tests, quickTest) {
    //const tests = loadTests.load();

    // Set this to true to run only the first group of tests
    //const quickTest = config.Debug.QuickTest
    console.log('QuickTest: ' + quickTest)
    //const onlyTestsName = "CqlIntervalOperatorsTest";
    //const onlyGroupName = "Collapse";
    //const onlyTestName = "QuantityIntervalCollapse";

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

            }//push array for each test file
            groupResults.push(groupTests);

            if (quickTest) {
                break; // Only load 1 test set for testing
            }
        }
    }
    return groupResults
}

function generateParametersResource(result, cqlEndpoint) {
    let data = '';

    // Check if the last part is $cql or $evaluate
    if (cqlEndpoint === '$cql') {
        data = {
            "resourceType": "Parameters",
            "parameter": [{
                "name": "expression",
                "valueString": result.expression
            }]
        };
    } else if (cqlEndpoint === '$evaluate') {
        data = {
            "resourceType": "Parameters",
            "parameter": [{
                "name": "url",
                "valueCanonical": "https://hl7.org/fhir/uv/cql/Library/" + result.testsName + "|1.0.000"
            },
            {
                "name": "expression",
                "valueString": "" + result.groupName + '.' + result.testName + ""
            }
            ]
        };
    } else {
        console.log('The URL does not end with $cql or $evaluate');
    }

    return data;
}


module.exports = {
    generateEmptyResults,
    generateParametersResource
}
