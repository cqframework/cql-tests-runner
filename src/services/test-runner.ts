import { ConfigLoader } from '../conf/config-loader';
import { CQLEngine } from '../cql-engine/cql-engine';
import { TestLoader } from '../loaders/test-loader';
import { CQLTestResults } from '../test-results/cql-test-results';
import { generateEmptyResults, generateParametersResource } from '../shared/results-shared';
import { TestResult } from '../models/test-types';
import { ResultExtractor } from '../extractors/result-extractor';
import { ServerConnectivity, ServerConnectivityError } from '../shared/server-connectivity';

// Import extractors
import { EvaluationErrorExtractor } from '../extractors/evaluation-error-extractor';
import { NullEmptyExtractor } from '../extractors/null-empty-extractor';
import { UndefinedExtractor } from '../extractors/undefined-extractor';
import { StringExtractor } from '../extractors/value-type-extractors/string-extractor';
import { BooleanExtractor } from '../extractors/value-type-extractors/boolean-extractor';
import { IntegerExtractor } from '../extractors/value-type-extractors/integer-extractor';
import { DecimalExtractor } from '../extractors/value-type-extractors/decimal-extractor';
import { DateExtractor } from '../extractors/value-type-extractors/date-extractor';
import { DateTimeExtractor } from '../extractors/value-type-extractors/datetime-extractor';
import { TimeExtractor } from '../extractors/value-type-extractors/time-extractor';
import { QuantityExtractor } from '../extractors/value-type-extractors/quantity-extractor';
import { RatioExtractor } from '../extractors/value-type-extractors/ratio-extractor';
import { DateTimeIntervalExtractor } from '../extractors/value-type-extractors/datetime-interval-extractor';
import { QuantityIntervalExtractor } from '../extractors/value-type-extractors/quantity-interval-extractor';
import { CodeExtractor } from '../extractors/value-type-extractors/code-extractor';
import { ConceptExtractor } from '../extractors/value-type-extractors/concept-extractor';

export interface TestRunnerOptions {
  onProgress?: (current: number, total: number, message?: string) => Promise<void>;
  useAxios?: boolean; // For backward compatibility with run-tests-command
}

export class TestRunner {
  private buildExtractor(): ResultExtractor {
    const extractors = new EvaluationErrorExtractor();
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
      .setNextExtractor(new DateTimeIntervalExtractor())
      .setNextExtractor(new QuantityIntervalExtractor())
      .setNextExtractor(new CodeExtractor())
      .setNextExtractor(new ConceptExtractor());

    return new ResultExtractor(extractors);
  }

  public async runTests(configData: any, options: TestRunnerOptions = {}): Promise<CQLTestResults> {
    // Create a temporary config loader from the provided data
    const config = this.createConfigFromData(configData);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;
    const testsRunDescription = config.Build.testsRunDescription;

    // Verify server connectivity before proceeding
    await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = '1.5'; //default value
    const cqlVersion = config.Build?.CqlVersion;
    if (typeof cqlVersion === 'string' && cqlVersion.trim() !== '') {
      cqlEngine.cqlVersion = cqlVersion;
    }

    // Load CVL using dynamic import
    // @ts-ignore
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const quickTest = config.Debug?.QuickTest || false;
    const resultExtractor = this.buildExtractor();
    const emptyResults = await generateEmptyResults(tests, quickTest);
    const skipMap = config.skipListMap();

    const results = new CQLTestResults(cqlEngine);

    const totalTests = emptyResults.reduce((sum, testFile) => sum + testFile.length, 0);
    let completedTests = 0;

    for (const testFile of emptyResults) {
      for (const result of testFile) {
        if (this.shouldSkipVersionTest(cqlEngine, result)) {
          //add to skipMap
          const skipReason = "test version " + result.testVersion + " not applicable to engine version " + cqlEngine.cqlVersion;
          this.addToSkipList(skipMap, result.testsName, result.groupName, result.testName, skipReason);
        }
        await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config, options.useAxios);
        results.add(result);

        completedTests++;
        if (options.onProgress) {
          await options.onProgress(
            completedTests,
            totalTests,
            `Running test ${result.testsName}:${result.groupName}:${result.testName}`
          );
        }
      }
    }
    // Return the CQLTestResults instance
    return results;
  }

  private async runTest(
    result: TestResult,
    apiUrl: string,
    cvl: any,
    resultExtractor: ResultExtractor,
    skipMap: Map<string, string>,
    config: ConfigLoader,
    useAxios: boolean = false
  ): Promise<TestResult> {
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

      let response: any;
      if (useAxios) {
        // Use axios for backward compatibility
        const axios = await import('axios');
        const axiosResponse = await axios.default.post(apiUrl, data, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        response = {
          status: axiosResponse.status,
          data: axiosResponse.data
        };
      } else {
        // Use fetch (default for new code)
        const fetchResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        response = {
          status: fetchResponse.status,
          data: await fetchResponse.json()
        };
      }

      result.responseStatus = response.status;
      const responseBody = response.data;
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
      result.error = { message: error.message, stack: error.stack };
    }

    console.log('Test %s:%s:%s status: %s expected: %s actual: %s',
      result.testsName, result.groupName, result.testName, result.testStatus, result.expected, result.actual);

    return result;
  }

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

  private createConfigFromData(configData: any): ConfigLoader {
    // Create a temporary config loader without validation (we already validated)
    const config = new ConfigLoader(undefined, false);

    // Manually populate the config from the provided data
    const baseURL = process.env.SERVER_BASE_URL || configData.FhirServer?.BaseUrl || 'https://cloud.alphora.com/sandbox/r4/cds/fhir';

    config.FhirServer = {
      BaseUrl: this.removeTrailingSlash(baseURL),
      CqlOperation: process.env.CQL_OPERATION || configData.FhirServer?.CqlOperation || '$cql'
    };

    config.Build = {
      CqlFileVersion: process.env.CQL_FILE_VERSION || configData.Build?.CqlFileVersion || '1.0.000',
      CqlOutputPath: process.env.CQL_OUTPUT_PATH || configData.Build?.CqlOutputPath || './cql',
      CqlVersion: process.env.CQL_VERSION || configData.Build?.CqlVersion,
      testsRunDescription: process.env.TESTS_RUN_DESCRIPTION || configData.Build?.testsRunDescription || "Development test run"
    };

    config.Tests = {
      ResultsPath: process.env.RESULTS_PATH || configData.Tests?.ResultsPath || './results',
      SkipList: process.env.SKIP_LIST || configData.Tests?.SkipList || []
    };

    config.Debug = {
      QuickTest: this.setQuickTestSetting(configData)
    };

    config.CqlEndpoint = this.cqlEndPoint(config.FhirServer.CqlOperation);

    return config;
  }

  private removeTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private cqlEndPoint(cqlOperation: string): string {
    if (cqlOperation === '$cql') {
      return '$cql';
    } else {
      return 'Library' + '/$evaluate';
    }
  }

  private setQuickTestSetting(configData: any): boolean {
    if (process.env.QUICK_TEST !== undefined) {
      return process.env.QUICK_TEST === 'true';
    }

    const configValue = configData.Debug?.QuickTest;
    if (configValue !== undefined) {
      return configValue as boolean;
    }

    return true;
  }

  private compareVersions(versionA: string | undefined, versionB: string | undefined): number {
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

  private shouldSkipVersionTest(cqlEngine: CQLEngine, result: TestResult): boolean {
    const engineVersion = cqlEngine?.cqlVersion;
    if (!engineVersion) return false; // no version to compare against
    // Rule 1: if test.version is set, engine must be >= test.version
    if (result.testVersion && this.compareVersions(engineVersion, result.testVersion) < 0) {
      return true;
    }
    // Rule 2: if test.versionTo is set, engine must be <= test.versionTo
    if (result.testVersionTo && this.compareVersions(engineVersion, result.testVersionTo) > 0) {
      return true;
    }
    return false; // passes all checks
  }

  private addToSkipList(skipMap: Map<string, string>, testsName: string, groupName: string, testName: string, reason: string): void {
    skipMap.set(`${testsName}-${groupName}-${testName}`, reason);
  }

}
