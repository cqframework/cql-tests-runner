import axios from 'axios';
import { TestLoader } from '../loaders/test-loader';
import { ConfigLoader } from '../conf/config-loader';
import { CQLEngine } from '../cql-engine/cql-engine';
import { CQLTestResults } from '../test-results/cql-test-results';
import { generateEmptyResults, generateParametersResource } from '../shared/results-shared';
import { TestResult } from '../models/test-types';

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
import { ResultExtractor } from '../extractors/result-extractor';

// Type declaration for CVL loader
declare const cvlLoader: () => Promise<[{ default: any }]>;

export class RunCommand {
  async execute(options: { config: string; output: string; validate?: boolean }): Promise<void> {
    const config = new ConfigLoader(options.config);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;
    const outputPath = options.output || config.Tests.ResultsPath;

    const cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = '1.5';

    // Load CVL using dynamic import
    // @ts-ignore
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const quickTest = config.Debug.QuickTest;
    const resultExtractor = this.buildExtractor();
    const emptyResults = await generateEmptyResults(tests, quickTest);
    const skipMap = config.skipListMap();

    const results = new CQLTestResults(cqlEngine);
    
    for (const testFile of emptyResults) {
      for (const result of testFile) {
        await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config);
        results.add(result);
      }
    }

    // Validate before saving if validation option is enabled
    if (options.validate) {
      console.log('Validating results before saving...');
      const isValid = await results.validate();
      if (isValid) {
        console.log('Results file validation passed');
      } else {
        console.log('Results file validation failed, but continuing to save file...');
      }
    }

    results.save(outputPath);
    
    // Always run validation after saving (existing behavior)
    await results.validate();
  }

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

  private async runTest(
    result: TestResult, 
    apiUrl: string, 
    cvl: any, 
    resultExtractor: ResultExtractor, 
    skipMap: Map<string, string>,
    config: ConfigLoader
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
}
