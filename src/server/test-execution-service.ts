// Author: Preston Lee

import { CQLTestResults } from '../test-results/cql-test-results.js';
import { generateEmptyResults, Result } from '../shared/results-shared.js';
import { createExecutionContext, runTest } from '../shared/run-test-core.js';

/**
 * Server/MCP-facing runner. Thin wrapper over the shared {@link runTest} core: builds the
 * execution context and returns JSON-shaped results. Shares identical execution and
 * classification with the CLI {@link TestRunner}.
 */
export class TestExecutionService {
	/**
	 * Runs all tests based on configuration.
	 */
	async runTests(configData: any): Promise<any> {
		const ctx = await createExecutionContext(configData);
		const quickTest = ctx.config.Debug?.QuickTest || false;
		const emptyResults = await generateEmptyResults(ctx.tests, quickTest);
		const results = new CQLTestResults(ctx.cqlEngine);

		for (const testFile of emptyResults) {
			for (const result of testFile) {
				await runTest(result, ctx);
				results.add(result);
			}
		}

		return results.toJSON();
	}

	/**
	 * Runs a single test by identifier.
	 */
	async runSingleTest(
		testsName: string,
		groupName: string,
		testName: string,
		configData: any
	): Promise<any> {
		const ctx = await createExecutionContext(configData);

		for (const testSuite of ctx.tests) {
			if (testSuite.name !== testsName) continue;
			for (const group of testSuite.group) {
				if (group.name !== groupName || !group.test) continue;
				for (const test of group.test) {
					if (test.name !== testName) continue;

					const result = new Result(testsName, groupName, test);
					await runTest(result, ctx);

					const testResults = new CQLTestResults(ctx.cqlEngine);
					testResults.add(result);
					return testResults.toJSON().results[0] ?? null;
				}
			}
		}

		throw new Error(`Test not found: ${testsName}/${groupName}/${testName}`);
	}

	/**
	 * Runs all tests in a group.
	 */
	async runTestGroup(testsName: string, groupName: string, configData: any): Promise<any[]> {
		const ctx = await createExecutionContext(configData);
		const results = new CQLTestResults(ctx.cqlEngine);

		for (const testSuite of ctx.tests) {
			if (testSuite.name !== testsName) continue;
			for (const group of testSuite.group) {
				if (group.name !== groupName || !group.test) continue;
				for (const test of group.test) {
					const result = new Result(testsName, groupName, test);
					await runTest(result, ctx);
					results.add(result);
				}
				return results.toJSON().results;
			}
		}

		return results.toJSON().results;
	}
}
