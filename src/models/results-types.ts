import type { TestResult } from './test-types.js';
import type { EvaluationRequestSupport } from '../shared/evaluation-request-probe.js';

export interface TestResultsSummary {
	pass: number;
	skip: number;
	fail: number;
	error: number;
}

export interface CQLTestResultsData {
	cqlengine: CQLEngineInfo;
	testsRunDateTime: string; // ISO date-time string
	testResultsSummary: {
		passCount: number;
		skipCount: number;
		failCount: number;
		errorCount: number;
	};
	testsRunDescription?: string;
	/** How evaluation requests were timed, and whether the server acted on it. */
	evaluationRequest?: EvaluationRequestSupport;
	results: TestResult[];
}

export interface CQLEngineInfo {
	apiUrl: string;
	description: string;
	cqlVersion: string;
	cqlTranslator: string;
	cqlTranslatorVersion: string;
	cqlEngine: string;
	cqlEngineVersion: string;
}
