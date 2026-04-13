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
import { ValueMap } from '../extractors/value-map.js';
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

    const build = config.Build;
    const cqlEngine = new CQLEngine(
      serverBaseUrl,
      cqlEndpoint,
      build.cqlTranslator ?? '',
      build.cqlTranslatorVersion ?? '',
      build.cqlEngine ?? '',
      build.cqlEngineVersion ?? '',
	  build.SERVER_OFFSET_ISO
    );
    cqlEngine.cqlVersion = '1.5'; //default value
    const cqlVersion = config.Build?.CqlVersion;
    if (typeof cqlVersion === 'string' && cqlVersion.trim() !== '') {
      cqlEngine.cqlVersion = cqlVersion;
    }

		await cqlEngine.fetch();

		const activeTimeZonePolicy = await this.resolveTimeZoneOffsetPolicy(
			config,
			cqlEngine.apiUrl!,
			cqlEngine['metadata'],
			options.useAxios
		);
		console.log('Resolved timezone policy:', activeTimeZonePolicy);
		// Load CVL using dynamic import
		// @ts-ignore
		const cvlModule = await import('../../cvl/cvl.mjs');
		const cvl = cvlModule.default;

		const tests = TestLoader.load();
		const quickTest = config.Debug?.QuickTest || false;
		const resultExtractor = buildExtractor();
		const emptyResults = await generateEmptyResults(tests, quickTest);
		const skipMap = config.skipListMap();
		const onlySet = config.onlyListSet();

		const results = new CQLTestResults(cqlEngine);

		const totalTests = emptyResults.reduce((sum, testFile) => sum + testFile.length, 0);
		let completedTests = 0;

		for (const testFile of emptyResults) {
			for (const result of testFile) {
				if (this.shouldSkipVersionTest(cqlEngine, result)) {
					const skipReason =
						result.testVersionTo &&
						this.compareVersions(cqlEngine.cqlVersion, result.testVersionTo) > 0
							? `test versionTo ${result.testVersionTo} not applicable to engine version ${cqlEngine.cqlVersion}`
							: `test version ${result.testVersion} not applicable to engine version ${cqlEngine.cqlVersion}`;

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
					onlySet,
					config,
					cqlEngine,
					activeTimeZonePolicy,
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
		onlySet: Set<string>,
		config: ConfigLoader,
		cqlEngine: CQLEngine,
		activeTimeZonePolicy: string,
		useAxios: boolean = false
	): Promise<InternalTestResult> {
		const key = `${result.testsName}-${result.groupName}-${result.testName}`;

		if (result.testStatus === 'skip') {
			if (!result.skipMessage?.trim()) {
				result.skipMessage = 'Skipped by cql-tests-runner';
			}
			console.log(
				'Test %s:%s:%s status: %s skipMessage: %s',
				result.testsName,
				result.groupName,
				result.testName,
				result.testStatus,
				result.skipMessage
			);
			return result;
		} else if (onlySet.size > 0 && !onlySet.has(key)) {
			result.SkipMessage = 'Skipped by OnlyList filter';
			result.testStatus = 'skip';
			return result;
		} else if (skipMap.has(key)) {
			const reason = skipMap.get(key) || '';
			result.SkipMessage = `Skipped by config: ${reason}`;
			result.testStatus = 'skip';
			console.log(
				'Test %s:%s:%s status: %s skipMessage: %s',
				result.testsName,
				result.groupName,
				result.testName,
				result.testStatus,
				result.skipMessage
			);
			return result;
		}

		const timezonePolicySkipReason = this.shouldSkipTimezonePolicyTest(
			result,
			activeTimeZonePolicy
		);
		if (timezonePolicySkipReason) {
			result.SkipMessage = timezonePolicySkipReason;
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

			this.applyServerOffsetToParameters(data, cqlEngine);

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
			const parsedExpected = cvl.parse(result.expected);
			result.actual = resultExtractor.extract(responseBody, {
				singletonListKeys: ValueMap.singletonListKeysFromExpected(parsedExpected),
			});
			const invalid = result.invalid;

			if (invalid === 'true' || invalid === 'semantic') {
				result.testStatus = response.status === 200 ? 'fail' : 'pass';
			} else {
				if (response.status === 200) {
					result.testStatus = resultsEqual(parsedExpected, result.actual)
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

	private async resolveTimeZoneOffsetPolicy(
		config: ConfigLoader,
		apiUrl: string,
		serverMetadata?: any,
		useAxios: boolean = false
	): Promise<string> {
		//
		const metadataPolicy = this.extractTimeZonePolicyFromMetadata(serverMetadata);
		if (metadataPolicy) {
			console.log('Resolved timezone policy from metadata:', metadataPolicy);
			return metadataPolicy;
		}

		const configuredPolicy =
			process.env.TIME_ZONE_OFFSET_POLICY?.trim() ||
			config.Build?.TimeZoneOffsetPolicy?.trim();

		if (configuredPolicy) {
			console.log('Resolved timezone policy from env/config:', configuredPolicy);
			return configuredPolicy;
		}

		const probedPolicy = await this.detectTimeZoneOffsetPolicy(apiUrl, useAxios);
		if (probedPolicy) {
			console.log('Resolved timezone policy from probe:', probedPolicy);
			return probedPolicy;
		}

		const fallbackPolicy = 'timezone-offset-policy.default-server-offset';
		console.log('Resolved timezone policy from fallback:', fallbackPolicy);
		return fallbackPolicy;
	}

	private async detectTimeZoneOffsetPolicy(
		apiUrl: string,
		useAxios: boolean = false
	): Promise<string | null> {
		// order of setting timezone offset policy: metadata -> env/config -> probe -> fallback
		const data = {
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'expression',
					valueString: 'timezoneoffset from @2012-04-01T00:00',
				},
			],
		};

		let response: any;

		if (useAxios) {
			const axios = await import('axios');
			const axiosResponse = await axios.default.post(apiUrl, data, {
				headers: { 'Content-Type': 'application/json' },
			});
			response = {
				status: axiosResponse.status,
				data: axiosResponse.data,
			};
		} else {
			const fetchResponse = await fetch(apiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			response = {
				status: fetchResponse.status,
				data: await fetchResponse.json(),
			};
		}

		if (response.status !== 200) {
			return null;
		}

		const extracted = this.extractProbeResult(response.data);

		if (extracted === 'null') {
			return 'timezone-offset-policy.no-default-offset';
		}

		if (typeof extracted === 'number') {
			return 'timezone-offset-policy.default-server-offset';
		}

		if (typeof extracted === 'string') {
			const trimmed = extracted.trim().toLowerCase();
			if (trimmed === 'null') {
				return 'timezone-offset-policy.no-default-offset';
			}
			if (/^-?\d+$/.test(trimmed)) {
				return 'timezone-offset-policy.default-server-offset';
			}
		}

		return null;
	}

	private extractProbeResult(responseBody: any): any {
		const parameter = responseBody?.parameter;
		if (!Array.isArray(parameter) || parameter.length === 0) {
			return null;
		}

		const returnParam = parameter.find((p: any) => p.name === 'return') || parameter[0];

		if (returnParam.valueInteger !== undefined) {
			return returnParam.valueInteger;
		}
		if (returnParam.valueDecimal !== undefined) {
			return returnParam.valueDecimal;
		}
		if (returnParam.valueString !== undefined) {
			return returnParam.valueString;
		}
		if (returnParam.valueBoolean !== undefined) {
			return returnParam.valueBoolean;
		}

		return null;
	}

	private extractTimeZonePolicyFromMetadata(metadata: any): string | null {
		if (!metadata || typeof metadata !== 'object') {
			return null;
		}

		const policyCodes = [
			'timezone-offset-policy.no-default-offset',
			'timezone-offset-policy.default-server-offset',
		];

		function findInObject(obj: any): string | null {
			if (!obj || typeof obj !== 'object') {
				return null;
			}

			if (Array.isArray(obj)) {
				for (const item of obj) {
					const found = findInObject(item);
					if (found) return found;
				}
				return null;
			}

			for (const [key, value] of Object.entries(obj)) {
				if (typeof value === 'string' && policyCodes.includes(value)) {
					return value;
				}

				if (key === 'code' && typeof value === 'string' && policyCodes.includes(value)) {
					return value;
				}

				if (
					key === 'valueCode' &&
					typeof value === 'string' &&
					policyCodes.includes(value)
				) {
					return value;
				}

				if (
					key === 'valueString' &&
					typeof value === 'string' &&
					policyCodes.includes(value)
				) {
					return value;
				}

				if (typeof value === 'object') {
					const found = findInObject(value);
					if (found) return found;
				}
			}

			return null;
		}

		return findInObject(metadata);
	}

	private applyServerOffsetToParameters(data: any, engine: CQLEngine): void {
		const expressionParam = data?.parameter?.find((p: any) => p.name === 'expression');
		if (!expressionParam || typeof expressionParam.valueString !== 'string') {
			return;
		}

		const offset = engine.SERVER_OFFSET_ISO;
		if (typeof offset !== 'string' || offset.trim() === '') {
			return;
		}

		expressionParam.valueString = this.replaceServerOffsetPlaceholder(
			expressionParam.valueString,
			offset
		);
	}

	private replaceServerOffsetPlaceholder(expression: string, serverOffsetISO: string): string {
		return expression.replace(/\{\{SERVER_OFFSET_ISO\}\}/g, serverOffsetISO);
	}

	private shouldSkipTimezonePolicyTest(test: any, activeTimeZonePolicy: string): string | null {
		const requiredCapabilities = test.capability || [];

		const requiredPolicy = requiredCapabilities.find((c: any) =>
			c.code?.startsWith('timezone-offset-policy.')
		)?.code;

		if (!requiredPolicy) {
			return null;
		}

		if (requiredPolicy !== activeTimeZonePolicy) {
			return `requires ${requiredPolicy} but server is ${activeTimeZonePolicy}`;
		}

		return null;
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
