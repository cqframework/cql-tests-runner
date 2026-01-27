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
