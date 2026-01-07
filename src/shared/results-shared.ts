import { Tests, Test, InternalTestResult, CapabilityKV } from '../models/test-types.js';
import { Parameters } from 'fhir/r4';

export class Result implements InternalTestResult {
  testStatus!: 'pass' | 'fail' | 'skip' | 'error';
  responseStatus?: number;
  actual?: any;
  expected?: string;
  error?: {
    message: string;
    name?: string;
    stack?: string;
  };
  testsName: string;
  groupName: string;
  testName: string;
  testVersion?: string;
  testVersionTo?: string;
  invalid: 'false' | 'true' | 'semantic' | 'undefined';
  expression: string;
  capability: CapabilityKV[] = [];

  constructor(testsName: string, groupName: string, test: Test) {
    this.testsName = testsName;
    this.groupName = groupName;
    this.testName = test.name;
    this.testVersion = test.version;
    this.testVersionTo = test.versionTo;

    if (typeof test.expression !== 'string') {
      if (test.expression === undefined) {
        this.invalid = "undefined";
        this.expression = "undefined";
      } else {
        this.invalid = test.expression.invalid;
        this.expression = test.expression.text;
      }
    } else {
      this.invalid = 'false';
      this.expression = test.expression;
    }

    if (test.output !== undefined) {
      if (typeof test.output !== 'string' && !Array.isArray(test.output)) {
        // TODO: Structure the result if it can be structured (i.e. is one of the expected types)
        this.expected = test.output.text;
      } else {
        this.expected = test.output as string;
      }
    } else {
      this.testStatus = 'skip';
    }

    this.capability = Array.isArray(test.capability) ? test.capability.map(({ code, value }) => ({ code, value })) : [];
  }
}

export async function generateEmptyResults(tests: Tests[], quickTest: boolean): Promise<Result[][]> {
  console.log('QuickTest: ' + quickTest);

  let results: Result[] = [];
  let groupResults: Result[][] = [];
  
  for (const ts of tests) {
    console.log('Tests: ' + ts.name);
    let groupTests: Result[] = [];
    
    for (const group of ts.group) {
      console.log('    Group: ' + group.name);
      let test = group.test;
      
      if (test != undefined) {
        for (const t of test) {
          console.log('        Test: ' + t.name);
          const r = new Result(ts.name, group.name, t);
          results.push(r);
          groupTests.push(r);
        }
      }
      
      if (quickTest) {
        break; // Only load 1 group for testing
      }
    }
    
    groupResults.push(groupTests);

    if (quickTest) {
      break; // Only load 1 test set for testing
    }
  }
  
  return groupResults;
}

export function generateParametersResource(result: InternalTestResult, cqlEndpoint: string): Parameters {
  let data: Parameters;

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
    throw new Error('Invalid CQL endpoint');
  }

  return data;
}
