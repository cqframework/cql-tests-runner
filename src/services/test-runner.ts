import { ConfigLoader } from '../conf/config-loader.js';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { TestLoader } from '../loaders/test-loader.js';
import { CQLTestResults } from '../test-results/cql-test-results.js';
import { generateEmptyResults, generateParametersResource } from '../shared/results-shared.js';
import { InternalTestResult } from '../models/test-types.js';
import { ResultExtractor } from '../extractors/result-extractor.js';
import { ServerConnectivity } from '../shared/server-connectivity.js';
import { buildExtractor } from '../server/extractor-builder.js';
import { createConfigFromData } from '../server/config-utils.js';
import { resultsEqual } from '../shared/results-utils.js';

export interface TestRunnerOptions {
	onProgress?: (current: number, total: number, message?: string) => Promise<void>;
	useAxios?: boolean; // For backward compatibility with run-tests-command
}

export class TestRunner {
	public async runTests(
		configData: any,
		options: TestRunnerOptions = {}
	): Promise<CQLTestResults> {
		// Create a temporary config loader from the provided data
		const config = createConfigFromData(configData);
		const serverBaseUrl = config.FhirServer.BaseUrl;
		const cqlEndpoint = config.CqlEndpoint;

		// Verify server connectivity before proceeding
		await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const cqlEngine = new CQLEngine(
		serverBaseUrl,
		cqlEndpoint,
		configData.Build.cqlTranslator,
		configData.Build.cqlTranslatorVersion,
		configData.Build.cqlEngine,
		configData.Build.cqlEngineVersion
	);
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
		const resultExtractor = buildExtractor();
		const emptyResults = await generateEmptyResults(tests, quickTest);
		const skipMap = config.skipListMap();

		const results = new CQLTestResults(cqlEngine);

		const totalTests = emptyResults.reduce((sum, testFile) => sum + testFile.length, 0);
		let completedTests = 0;

		for (const testFile of emptyResults) {
			for (const result of testFile) {
				if (this.shouldSkipVersionTest(cqlEngine, result)) {
					//add to skipMap
					const skipReason =
						'test version ' +
						result.testVersion +
						' not applicable to engine version ' +
						cqlEngine.cqlVersion;
					this.addToSkipList(
						skipMap,
						result.testsName,
						result.groupName,
						result.testName,
						skipReason
					);
				}
				await this.runTest(
					result,
					cqlEngine.apiUrl!,
					cvl,
					resultExtractor,
					skipMap,
					config,
					options.useAxios
				);
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
		result: InternalTestResult,
		apiUrl: string,
		cvl: any,
		resultExtractor: ResultExtractor,
		skipMap: Map<string, string>,
		config: ConfigLoader,
		useAxios: boolean = false
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
			console.log(
				'Running test %s:%s:%s',
				result.testsName,
				result.groupName,
				result.testName
			);

			let response: any;
			if (useAxios) {
				// Use axios for backward compatibility
				const axios = await import('axios');
				const axiosResponse = await axios.default.post(apiUrl, data, {
					headers: {
						'Content-Type': 'application/json',
					},
				});
				response = {
					status: axiosResponse.status,
					data: axiosResponse.data,
				};
			} else {
				// Use fetch (default for new code)
				const fetchResponse = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data),
				});
				response = {
					status: fetchResponse.status,
					data: await fetchResponse.json(),
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
					result.testStatus = resultsEqual(cvl.parse(result.expected), result.actual)
						? 'pass'
						: 'fail';
				} else {
					result.testStatus = 'fail';
				}
			}
		} catch (error: any) {
			result.testStatus = 'error';
			result.error = {
				message: error.message,
				name: error.name || 'Error',
				stack: error.stack,
			};
		}

		console.log(
			'Test %s:%s:%s status: %s expected: %s actual: %s',
			result.testsName,
			result.groupName,
			result.testName,
			result.testStatus,
			result.expected,
			result.actual
		);

		return result;
	}

	private compareVersions(versionA: string | undefined, versionB: string | undefined): number {
		// Split into numeric parts (e.g., "1.5.2" → [1,5,2])
		const partsA = String(versionA ?? '')
			.trim()
			.split('.')
			.map(n => parseInt(n, 10) || 0);
		const partsB = String(versionB ?? '')
			.trim()
			.split('.')
			.map(n => parseInt(n, 10) || 0);

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

	private shouldSkipVersionTest(cqlEngine: CQLEngine, result: InternalTestResult): boolean {
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

	private addToSkipList(
		skipMap: Map<string, string>,
		testsName: string,
		groupName: string,
		testName: string,
		reason: string
	): void {
		skipMap.set(`${testsName}-${groupName}-${testName}`, reason);
	}
}
