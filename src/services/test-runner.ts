import { CQLTestResults } from '../test-results/cql-test-results.js';
import { generateEmptyResults } from '../shared/results-shared.js';
import { createExecutionContext, runTest } from '../shared/run-test-core.js';

export interface TestRunnerOptions {
	onProgress?: (current: number, total: number, message?: string) => Promise<void>;
}

/**
 * CLI-facing runner. Builds the shared execution context, runs every loaded test through the
 * shared {@link runTest}, and reports progress via the optional callback. Returns the
 * {@link CQLTestResults} instance so the caller can validate and save it.
 */
export class TestRunner {
	public async runTests(
		configData: any,
		options: TestRunnerOptions = {}
	): Promise<CQLTestResults> {
		const ctx = await createExecutionContext(configData);
		const quickTest = ctx.config.Debug?.QuickTest || false;
		const emptyResults = await generateEmptyResults(ctx.tests, quickTest);

		const results = new CQLTestResults(ctx.cqlEngine);
		const totalTests = emptyResults.reduce((sum, testFile) => sum + testFile.length, 0);
		let completedTests = 0;

		for (const testFile of emptyResults) {
			for (const result of testFile) {
				await runTest(result, ctx);
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

		return results;
	}
}
