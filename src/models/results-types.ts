import { TestResult } from './test-types.js';

export interface TestResultsSummary {
  pass: number;
  skip: number;
  fail: number;
  error: number;
}

export interface CQLTestResultsData {
  cqlengine: any;
  testsRunDateTime: Date;
  testResultsSummary: {
    passCount: number;
    skipCount: number;
    failCount: number;
    errorCount: number;
  };
  testsRunDescription: string;
  results: TestResult[];
}

export interface CQLEngineInfo {
  apiUrl?: string;
  cqlVersion?: string;
  cqlTranslator?: string;
  cqlTranslatorVersion?: string;
  cqlEngine?: string;
  cqlEngineVersion?: string;
}
