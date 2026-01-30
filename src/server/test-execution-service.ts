// Author: Preston Lee

import { ConfigLoader } from '../conf/config-loader.js';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { CQLTestResults } from '../test-results/cql-test-results.js';
import { TestLoader } from '../loaders/test-loader.js';
import {
  generateEmptyResults,
  generateParametersResource,
  Result,
} from '../shared/results-shared.js';
import { InternalTestResult, Tests } from '../models/test-types.js';
import { ServerConnectivity } from '../shared/server-connectivity.js';
import { ResultExtractor } from '../extractors/result-extractor.js';
import { buildExtractor } from './extractor-builder.js';
import { createConfigFromData } from './config-utils.js';
import { resultsEqual } from '../shared/results-utils.js';

interface ExecutionContext {
  config: ConfigLoader;
  cqlEngine: CQLEngine;
  cvl: any;
  tests: Tests[];
  resultExtractor: ResultExtractor;
  skipMap: Map<string, string>;
}

export class TestExecutionService {
  /**
   * Builds shared execution context from config data (engine, CVL, tests, extractor, skip map).
   */
  private async createExecutionContext(configData: any): Promise<ExecutionContext> {
    const config = createConfigFromData(configData);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;

    await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const build = config.Build;
    const cqlEngine = new CQLEngine(
      serverBaseUrl,
      cqlEndpoint,
      build?.cqlTranslator ?? '',
      build?.cqlTranslatorVersion ?? '',
      build?.cqlEngine ?? '',
      build?.cqlEngineVersion ?? ''
    );
    cqlEngine.cqlVersion = config.Build?.CqlVersion || '1.5';

    // @ts-expect-error - cvl.mjs has no declaration file
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const resultExtractor = buildExtractor();
    const skipMap = config.skipListMap();

    return { config, cqlEngine, cvl, tests, resultExtractor, skipMap };
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
          result.testStatus = resultsEqual(cvl.parse(result.expected), result.actual) ? 'pass' : 'fail';
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
    const ctx = await this.createExecutionContext(configData);
    const { config, cqlEngine, cvl, tests, resultExtractor, skipMap } = ctx;

    const quickTest = config.Debug?.QuickTest || false;
    const emptyResults = await generateEmptyResults(tests, quickTest);
    const results = new CQLTestResults(cqlEngine);

    for (const testFile of emptyResults) {
      for (const result of testFile) {
        await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config);
        results.add(result);
      }
    }

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
    const ctx = await this.createExecutionContext(configData);
    const { config, cqlEngine, cvl, tests, resultExtractor, skipMap } = ctx;

    for (const testSuite of tests) {
      if (testSuite.name !== testsName) continue;
      for (const group of testSuite.group) {
        if (group.name !== groupName || !group.test) continue;
        for (const test of group.test) {
          if (test.name !== testName) continue;

          const result = new Result(testsName, groupName, test);
          await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config);

          const testResults = new CQLTestResults(cqlEngine);
          testResults.add(result);
          return testResults.toJSON().results[0] ?? null;
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
    const ctx = await this.createExecutionContext(configData);
    const { config, cqlEngine, cvl, tests, resultExtractor, skipMap } = ctx;

    const results = new CQLTestResults(cqlEngine);

    for (const testSuite of tests) {
      if (testSuite.name !== testsName) continue;
      for (const group of testSuite.group) {
        if (group.name !== groupName || !group.test) continue;
        for (const test of group.test) {
          const result = new Result(testsName, groupName, test);
          await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config);
          results.add(result);
        }
        return results.toJSON().results;
      }
    }

    return results.toJSON().results;
  }
}
