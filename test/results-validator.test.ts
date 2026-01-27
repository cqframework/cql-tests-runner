// Author: Preston Lee

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultsValidator } from '../src/conf/results-validator.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Helper to get test data directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ResultsValidator', () => {
  let validator: ResultsValidator;

  beforeEach(() => {
    validator = new ResultsValidator();
  });

  describe('validateResults', () => {
    it('should validate a complete valid results object', () => {
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

      const validation = validator.validateResults(validResults);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject results missing required cqlengine fields', () => {
      const invalidResults = {
        cqlengine: {
          apiUrl: 'http://localhost:8080/fhir/$cql',
          // Missing required fields
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

      const validation = validator.validateResults(invalidResults);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject results missing testResultsSummary', () => {
      const invalidResults = {
        cqlengine: {
          apiUrl: 'http://localhost:8080/fhir/$cql',
          description: 'Test',
          cqlVersion: '1.5',
          cqlTranslator: 'Translator',
          cqlTranslatorVersion: '1.0.0',
          cqlEngine: 'Engine',
          cqlEngineVersion: '1.0.0',
        },
        testsRunDateTime: '2025-01-27T12:00:00.000Z',
        results: [],
      };

      const validation = validator.validateResults(invalidResults);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject results with invalid testStatus enum value', () => {
      const invalidResults = {
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
        results: [
          {
            testsName: 'TestSuite',
            groupName: 'TestGroup',
            testName: 'Test1',
            expression: '1 + 1',
            testStatus: 'invalid_status', // Invalid enum value
          },
        ],
      };

      const validation = validator.validateResults(invalidResults);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should accept results with optional testsRunDescription', () => {
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
        testsRunDescription: 'Optional description',
        results: [],
      };

      const validation = validator.validateResults(validResults);
      expect(validation.isValid).toBe(true);
    });

    it('should validate results with error objects', () => {
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
          errorCount: 1,
        },
        testsRunDateTime: '2025-01-27T12:00:00.000Z',
        results: [
          {
            testsName: 'TestSuite',
            groupName: 'TestGroup',
            testName: 'Test1',
            expression: '1 + 1',
            testStatus: 'error',
            error: {
              message: 'Test error message',
              name: 'Error',
              stack: 'Error stack trace',
            },
          },
        ],
      };

      const validation = validator.validateResults(validResults);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('validateResultsFile', () => {
    it('should validate a valid results file', () => {
      // Create a temporary valid results file
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, 'valid-results.json');
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
      fs.writeFileSync(tempFile, JSON.stringify(validResults, null, 2));

      try {
        const validation = validator.validateResultsFile(tempFile);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      } finally {
        // Cleanup
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should return error for non-existent file', () => {
      const nonExistentFile = path.join(__dirname, 'non-existent-results.json');
      const validation = validator.validateResultsFile(nonExistentFile);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].message).toContain('not found');
    });

    it('should return error for invalid JSON file', () => {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, 'invalid-json.json');
      fs.writeFileSync(tempFile, 'invalid json content');

      try {
        const validation = validator.validateResultsFile(tempFile);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors[0].message).toContain('Error reading results file');
      } finally {
        // Cleanup
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });

  describe('formatErrors', () => {
    it('should format errors correctly', () => {
      const errors = [
        {
          message: 'Required field missing',
          dataPath: '/cqlengine',
          schemaPath: '',
        },
        {
          message: 'Invalid type',
          dataPath: '/testResultsSummary/passCount',
          schemaPath: '',
        },
      ];

      const formatted = validator.formatErrors(errors);
      expect(formatted).toContain('Required field missing');
      expect(formatted).toContain('Invalid type');
      expect(formatted).toContain('at /cqlengine');
      expect(formatted).toContain('at /testResultsSummary/passCount');
    });

    it('should return message for empty errors array', () => {
      const formatted = validator.formatErrors([]);
      expect(formatted).toBe('No validation errors found.');
    });
  });
});
