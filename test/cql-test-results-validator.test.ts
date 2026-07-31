import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CQLTestResults } from '../src/test-results/cql-test-results.js';
import { CQLEngine } from '../src/cql-engine/cql-engine.js';

// Mock CQLEngine
vi.mock('../src/cql-engine/cql-engine', () => ({
  CQLEngine: vi.fn().mockImplementation(function (this: any) {
    this.apiUrl = 'http://localhost:8080/fhir/$cql';
    this.cqlVersion = '1.5';
    this.cqlTranslator = 'CQL Translator';
    this.cqlTranslatorVersion = '1.0.0';
    this.cqlEngine = 'CQL Engine';
    this.cqlEngineVersion = '1.0.0';
    this.description = 'Test Engine';
    this.toJSON = vi.fn().mockReturnValue({
      apiUrl: 'http://localhost:8080/fhir/$cql',
      description: 'Test Engine',
      cqlVersion: '1.5',
      cqlTranslator: 'CQL Translator',
      cqlTranslatorVersion: '1.0.0',
      cqlEngine: 'CQL Engine',
      cqlEngineVersion: '1.0.0',
    });
    return this;
  }),
}));

// Mock ResultsValidator
vi.mock('../src/conf/results-validator', () => ({
  ResultsValidator: vi.fn().mockImplementation(function (this: any) {
    this.validateResults = vi.fn().mockImplementation((resultsData: any) => {
      const requiredFields = ['cqlengine', 'testResultsSummary', 'testsRunDateTime', 'results'];
      const hasRequiredFields = requiredFields.every(field => resultsData?.[field]);

      return hasRequiredFields
        ? { isValid: true, errors: [] }
        : {
          isValid: false,
          errors: requiredFields
            .filter(field => !resultsData?.[field])
            .map(field => ({
              message: `must have required property '${field}' at #/required`,
              dataPath: '',
              schemaPath: '',
            })),
        };
    });
    return this;
  }),
}));

describe('CQLTestResults.validateSchema', () => {
  let cqlEngine: CQLEngine;

  beforeEach(() => {
    cqlEngine = new CQLEngine('http://localhost:8080/fhir/$cql');
    vi.clearAllMocks();
  });

  it('should validate a complete valid results object', async () => {
    const validResults = {
      cqlengine: {
        apiUrl: 'http://localhost:8080/fhir/$cql',
        description: 'Test CQL Engine',
        cqlVersion: '1.5',
        cqlTranslator: 'CQL Translator',
        cqlTranslatorVersion: '1.0.0',
        cqlEngine: 'CQL Engine',
        cqlEngineVersion: '1.0.0',
      },
      testResultsSummary: {
        passCount: 10,
        skipCount: 2,
        failCount: 1,
        errorCount: 0,
      },
      testsRunDateTime: '2025-01-27T12:00:00.000Z',
      results: [
        {
          testsName: 'TestSuite',
          groupName: 'TestGroup',
          testName: 'Test1',
          expression: '1 + 1',
          testStatus: 'pass',
          actual: '2',
          expected: '2',
        },
      ],
    };

    const isValid = await CQLTestResults.validateSchema(validResults);
    expect(isValid).toBe(true);
  });

  it('should reject results missing required fields', async () => {
    const invalidResults = {
      // Missing cqlengine, testResultsSummary, testsRunDateTime, results
    };

    const isValid = await CQLTestResults.validateSchema(invalidResults);
    expect(isValid).toBe(false);
  });

  it('should use ResultsValidator internally', async () => {
    const { ResultsValidator } = await import('../src/conf/results-validator.js');
    const validResults = {
      cqlengine: {
        apiUrl: 'http://localhost:8080/fhir/$cql',
        description: 'Test',
        cqlVersion: '1.5',
        cqlTranslator: 'Translator',
        cqlTranslatorVersion: '1.0.0',
        cqlEngine: 'Engine',
        cqlEngineVersion: '1.0.0',
      },
      testResultsSummary: {
        passCount: 0,
        skipCount: 0,
        failCount: 0,
        errorCount: 0,
      },
      testsRunDateTime: '2025-01-27T12:00:00.000Z',
      results: [],
    };

    await CQLTestResults.validateSchema(validResults);

    // Verify ResultsValidator was instantiated
    expect(ResultsValidator).toHaveBeenCalled();
  });
});

describe('CQLTestResults.toJSON actual serialization', () => {
  it('renders list results in CQL list syntax and stringifies scalar results', () => {
    const results = new CQLTestResults(new CQLEngine('http://localhost:8080/fhir/$cql'));
    results.add({
      testsName: 'CqlListOperatorsTest',
      groupName: 'Sort',
      testName: 'SortDatesAsc',
      expression: 'sort asc',
      testStatus: 'fail',
      invalid: 'false',
      actual: ['@2012-01-01T', '@2012-01-01T12'],
      expected: '{ @2012-01-01T, @2012-01-01T12 }',
    } as any);
    results.add({
      testsName: 'CqlArithmeticFunctionsTest',
      groupName: 'Power',
      testName: 'Power2To4',
      expression: '2^4',
      testStatus: 'pass',
      invalid: 'false',
      actual: 16,
      expected: '16',
    } as any);

    const json = results.toJSON();
    expect(json.results[0].actual).toBe('{ @2012-01-01T, @2012-01-01T12 }');
    expect(json.results[1].actual).toBe('16');
  });

  it('equalizeValueTypes renders array actuals in CQL list syntax', () => {
    const results = new CQLTestResults(new CQLEngine('http://localhost:8080/fhir/$cql'));
    results.add({
      testsName: 'T',
      groupName: 'G',
      testName: 'N',
      expression: 'e',
      testStatus: 'pass',
      invalid: 'false',
      actual: [1, 2, 3],
      expected: '{ 1, 2, 3 }',
    } as any);

    results.equalizeValueTypes();
    expect(results.results[0].actual).toBe('{ 1, 2, 3 }');
  });

  it('renders nested lists and empty lists', () => {
    const results = new CQLTestResults(new CQLEngine('http://localhost:8080/fhir/$cql'));
    results.add({
      testsName: 'T',
      groupName: 'G',
      testName: 'Nested',
      expression: 'e',
      testStatus: 'pass',
      invalid: 'false',
      actual: [[1, 2], []],
      expected: '{ { 1, 2 }, {} }',
    } as any);

    const json = results.toJSON();
    expect(json.results[0].actual).toBe('{ { 1, 2 }, {} }');
  });

  it('renders interval actuals in CQL interval syntax', () => {
    const results = new CQLTestResults(new CQLEngine('http://localhost:8080/fhir/$cql'));
    results.add({
      testsName: 'CqlIntervalOperatorsTest',
      groupName: 'Interval',
      testName: 'TimeIntervalTest',
      expression: 'Interval[@T00:00:00.000, @T23:59:59.599]',
      testStatus: 'pass',
      invalid: 'false',
      actual: {
        lowClosed: true,
        low: '@T00:00:00.000',
        highClosed: true,
        high: '@T23:59:59.599',
      },
      expected: 'Interval[@T00:00:00.000, @T23:59:59.599]',
    } as any);
    results.add({
      testsName: 'T',
      groupName: 'G',
      testName: 'OpenHigh',
      expression: 'e',
      testStatus: 'pass',
      invalid: 'false',
      actual: { lowClosed: true, low: 1, highClosed: false, high: null },
      expected: 'Interval[1, null)',
    } as any);

    const json = results.toJSON();
    expect(json.results[0].actual).toBe('Interval[@T00:00:00.000, @T23:59:59.599]');
    expect(json.results[1].actual).toBe('Interval[1, null)');
  });

  it('renders quantity actuals in CQL quantity syntax, standalone and as boundaries', () => {
    const results = new CQLTestResults(new CQLEngine('http://localhost:8080/fhir/$cql'));
    results.add({
      testsName: 'CqlArithmeticFunctionsTest',
      groupName: 'Multiply',
      testName: 'Multiply1CMBy2CM',
      expression: "1.0 'cm' * 2.0 'cm'",
      testStatus: 'fail',
      invalid: 'false',
      actual: { value: 0.0002, unit: 'm2' },
      expected: "2.0'cm2'",
    } as any);
    results.add({
      testsName: 'T',
      groupName: 'G',
      testName: 'QuantityInterval',
      expression: 'e',
      testStatus: 'pass',
      invalid: 'false',
      actual: {
        lowClosed: true,
        low: { value: 1, unit: 'ml' },
        highClosed: true,
        high: { value: 2, unit: 'ml' },
      },
      expected: "Interval[1 'ml', 2 'ml']",
    } as any);

    const json = results.toJSON();
    expect(json.results[0].actual).toBe("0.0002 'm2'");
    expect(json.results[1].actual).toBe("Interval[1 'ml', 2 'ml']");
  });

  it('keeps JSON rendering for objects that are not intervals or quantities', () => {
    const results = new CQLTestResults(new CQLEngine('http://localhost:8080/fhir/$cql'));
    results.add({
      testsName: 'T',
      groupName: 'G',
      testName: 'Tuple',
      expression: 'e',
      testStatus: 'pass',
      invalid: 'false',
      actual: { value: 1, unit: null },
      expected: 'Tuple { value: 1, unit: null }',
    } as any);

    const json = results.toJSON();
    expect(json.results[0].actual).toBe('{"value":1,"unit":null}');
  });
});
