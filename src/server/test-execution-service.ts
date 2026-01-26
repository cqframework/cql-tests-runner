import { ConfigLoader } from '../conf/config-loader.js';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { CQLTestResults } from '../test-results/cql-test-results.js';
import { TestLoader } from '../loaders/test-loader.js';
import {
  generateEmptyResults,
  generateParametersResource,
  Result,
} from '../shared/results-shared.js';
import { InternalTestResult } from '../models/test-types.js';
import { ServerConnectivity } from '../shared/server-connectivity.js';
import { ResultExtractor } from '../extractors/result-extractor.js';
import { buildExtractor } from './extractor-builder.js';
import { createConfigFromData } from './config-utils.js';

// Type declaration for CVL loader
declare const cvlLoader: () => Promise<[{ default: any }]>;

export class TestExecutionService {
  /**
   * Compares two results for equality, handling nested objects and numbers
   */
  private resultsEqual(expected: any, actual: any): boolean {
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
      if (!actualKeys.includes(key) || !this.resultsEqual(expected[key], actual[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Runs a single test
   */
  private async runTest(
    result: InternalTestResult,
    apiUrl: string,
    cvl: any,
    resultExtractor: ResultExtractor,
    skipMap: Map<string, string>,
    config: ConfigLoader
  ): Promise<InternalTestResult> {
    const key = `${result.testsName}-${result.groupName}-${result.testName}`;
    
    if (result.testStatus === 'skip') {
      result.SkipMessage = 'Skipped by cql-tests-runner';
      return result;
    } else if (skipMap.has(key)) {
      const reason = skipMap.get(key) || '';
      result.SkipMessage = `Skipped by config: ${reason}`;
      result.testStatus = 'skip';
      return result;
    }

    const data = generateParametersResource(result, config.FhirServer.CqlOperation);

    try {
      console.log('Running test %s:%s:%s', result.testsName, result.groupName, result.testName);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      result.responseStatus = response.status;
      const responseBody = await response.json();
      result.actual = resultExtractor.extract(responseBody);
      const invalid = result.invalid;
      
      if (invalid === 'true' || invalid === 'semantic') {
        result.testStatus = response.status === 200 ? 'fail' : 'pass';
      } else {
        if (response.status === 200) {
          result.testStatus = this.resultsEqual(cvl.parse(result.expected), result.actual) ? 'pass' : 'fail';
        } else {
          result.testStatus = 'fail';
        }
      }
    } catch (error: any) {
      result.testStatus = 'error';
      result.error = {
        message: error.message,
        name: error.name || 'Error',
        stack: error.stack 
      };
    }

    console.log('Test %s:%s:%s status: %s expected: %s actual: %s', 
      result.testsName, result.groupName, result.testName, result.testStatus, result.expected, result.actual);
    
    return result;
  }

  /**
   * Runs all tests based on configuration
   */
  async runTests(configData: any): Promise<any> {
    // Create a temporary config loader from the provided data
    const config = createConfigFromData(configData);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;

    // Verify server connectivity before proceeding
    await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = config.Build?.CqlVersion || '1.5';

    // Load CVL using dynamic import
    // @ts-ignore
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const quickTest = config.Debug?.QuickTest || false;
    const resultExtractor = buildExtractor();
    const emptyResults = await generateEmptyResults(tests, quickTest);
    const skipMap = config.skipListMap();

    const results = new CQLTestResults(cqlEngine);
    
    for (const testFile of emptyResults) {
      for (const result of testFile) {
        await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config);
        results.add(result);
      }
    }

    // Return the results data that would normally be written to file
    return results.toJSON();
  }

  /**
   * Runs a single test by identifier
   */
  async runSingleTest(
    testsName: string,
    groupName: string,
    testName: string,
    configData: any
  ): Promise<any> {
    const config = createConfigFromData(configData);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;

    await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = config.Build?.CqlVersion || '1.5';

    // @ts-ignore
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const resultExtractor = buildExtractor();
    const skipMap = config.skipListMap();

    // Find the specific test
    for (const testSuite of tests) {
      if (testSuite.name === testsName) {
        for (const group of testSuite.group) {
          if (group.name === groupName && group.test) {
            for (const test of group.test) {
              if (test.name === testName) {
                const result = new Result(testsName, groupName, test);
                await this.runTest(
                  result,
                  cqlEngine.apiUrl!,
                  cvl,
                  resultExtractor,
                  skipMap,
                  config
                );

                // Convert to schema-compliant format
                const testResults = new CQLTestResults(cqlEngine);
                testResults.add(result);
                const jsonResults = testResults.toJSON();

                // Return just the single test result
                return jsonResults.results[0] || null;
              }
            }
          }
        }
      }
    }

    throw new Error(`Test not found: ${testsName}/${groupName}/${testName}`);
  }

  /**
   * Runs all tests in a group
   */
  async runTestGroup(
    testsName: string,
    groupName: string,
    configData: any
  ): Promise<any[]> {
    const config = createConfigFromData(configData);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;

    await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = config.Build?.CqlVersion || '1.5';

    // @ts-ignore
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const resultExtractor = buildExtractor();
    const skipMap = config.skipListMap();

    const results = new CQLTestResults(cqlEngine);

    // Find and run tests in the specified group
    for (const testSuite of tests) {
      if (testSuite.name === testsName) {
        for (const group of testSuite.group) {
          if (group.name === groupName && group.test) {
            for (const test of group.test) {
              const result = new Result(testsName, groupName, test);
              await this.runTest(
                result,
                cqlEngine.apiUrl!,
                cvl,
                resultExtractor,
                skipMap,
                config
              );
              results.add(result);
            }
            break;
          }
        }
        break;
      }
    }

    const jsonResults = results.toJSON();
    return jsonResults.results;
  }
}
