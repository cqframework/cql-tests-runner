import { ConfigLoader } from '../conf/config-loader.js';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { TestLoader } from '../loaders/test-loader.js';
import { generateParametersResource, responseIndicatesError } from './results-shared.js';
import type { InternalTestResult, Tests } from '../models/test-types.js';
import { ServerConnectivity } from './server-connectivity.js';
import { ResultExtractor } from '../extractors/result-extractor.js';
import { buildExtractor } from '../server/extractor-builder.js';
import { createConfigFromData } from '../server/config-utils.js';
import { ValueMap } from '../extractors/value-map.js';
import { resultsEqual } from './results-utils.js';
import { formatActualValue } from '../test-results/cql-test-results.js';
import { publishTestLibrary } from './library-publisher.js';
import type { PublishedLibrary } from './library-publisher.js';

/**
 * Shared execution state for a test run: the resolved config, the engine, the CVL parser,
 * the loaded test suites, the value extractor, and the skip/only filters. Built once per
 * run and threaded through every {@link runTest} call.
 */
export interface ExecutionContext {
	config: ConfigLoader;
	cqlEngine: CQLEngine;
	cvl: any;
	tests: Tests[];
	resultExtractor: ResultExtractor;
	skipMap: Map<string, string>;
	onlySet: Set<string>;
}

/**
 * Builds the shared execution context from config data: resolves config, verifies server
 * connectivity, constructs the engine, loads the CVL parser and test suites, and builds the
 * extractor and skip/only filters. Used by both the CLI ({@link TestRunner}) and server
 * ({@link TestExecutionService}) entry points so they run tests identically.
 */
export async function createExecutionContext(configData: any): Promise<ExecutionContext> {
	const config = createConfigFromData(configData);
	const serverBaseUrl = config.FhirServer.BaseUrl;
	const cqlEndpoint = config.CqlEndpoint;

	await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

	const build = config.Build;
	const cqlEngine = new CQLEngine(
		serverBaseUrl,
		cqlEndpoint,
		build?.cqlTranslator ?? '',
		build?.cqlTranslatorVersion ?? '',
		build?.cqlEngine ?? '',
		build?.cqlEngineVersion ?? ''
	);
	cqlEngine.cqlVersion = config.Build?.CqlVersion || '1.5';

	// @ts-expect-error - cvl.mjs has no declaration file
	const cvlModule = await import('../../cvl/cvl.mjs');
	const cvl = cvlModule.default;

	const tests = TestLoader.load();
	const resultExtractor = buildExtractor();
	const skipMap = config.skipListMap();
	const onlySet = config.onlyListSet();

	return { config, cqlEngine, cvl, tests, resultExtractor, skipMap, onlySet };
}

/**
 * Compares two dotted version strings (e.g. "1.5.2"). Returns -1 if a < b, 1 if a > b, 0 if equal.
 * Missing/blank segments are treated as 0.
 */
export function compareVersions(versionA: string | undefined, versionB: string | undefined): number {
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
			return numA < numB ? -1 : 1;
		}
	}
	return 0;
}

/**
 * Returns a human-readable reason if the test is out of scope for the engine's CQL version
 * (engine older than the test's `version`, or newer than its `versionTo`), or null if it applies.
 */
export function versionSkipReason(
	engineVersion: string | null | undefined,
	result: InternalTestResult
): string | null {
	if (!engineVersion) return null;
	if (result.testVersion && compareVersions(engineVersion, result.testVersion) < 0) {
		return `test version ${result.testVersion} not applicable to engine version ${engineVersion}`;
	}
	if (result.testVersionTo && compareVersions(engineVersion, result.testVersionTo) > 0) {
		return `test versionTo ${result.testVersionTo} not applicable to engine version ${engineVersion}`;
	}
	return null;
}

function logSkip(result: InternalTestResult): void {
	console.log(
		'Test %s:%s:%s status: %s skipMessage: %s',
		result.testsName,
		result.groupName,
		result.testName,
		result.testStatus,
		result.skipMessage
	);
}

/**
 * Runs a single test against the engine and records its outcome on `result`. Applies skip
 * precedence (pre-marked skip → OnlyList → config SkipList → version gating), then POSTs the
 * expression, extracts the actual value, and classifies pass/fail/error. Errors expected by
 * `invalid="true"/"semantic"` tests pass only when the engine actually erred.
 *
 * This is the single implementation shared by the CLI and server runners — both use `fetch` and
 * identical classification, so a test scores the same regardless of how it is invoked.
 */
export async function runTest(
	result: InternalTestResult,
	ctx: ExecutionContext
): Promise<InternalTestResult> {
	const { config, cqlEngine, cvl, resultExtractor, skipMap, onlySet } = ctx;
	const apiUrl = cqlEngine.apiUrl!;
	const key = `${result.testsName}-${result.groupName}-${result.testName}`;

	// Skip precedence.
	if (result.testStatus === 'skip') {
		if (!result.skipMessage?.trim()) {
			result.skipMessage = 'Skipped by cql-tests-runner';
		}
		logSkip(result);
		return result;
	} else if (onlySet.size > 0 && !onlySet.has(key)) {
		result.testStatus = 'skip';
		result.skipMessage = 'Skipped by OnlyList filter';
		logSkip(result);
		return result;
	} else if (skipMap.has(key)) {
		result.testStatus = 'skip';
		result.skipMessage = `Skipped by config: ${skipMap.get(key) || ''}`;
		logSkip(result);
		return result;
	} else if (result.library !== undefined && config.FhirServer.CqlOperation !== '$evaluate') {
		// A whole CQL library can only be evaluated via Library/$evaluate, which needs the
		// library published first; $cql takes an expression and has no way to carry one.
		result.testStatus = 'skip';
		result.skipMessage =
			'Library-style tests require a server configured for the Library/$evaluate operation';
		logSkip(result);
		return result;
	}

	// Version gating — applies to both the CLI and server paths.
	const versionSkip = versionSkipReason(cqlEngine.cqlVersion, result);
	if (versionSkip) {
		result.testStatus = 'skip';
		result.skipMessage = `Skipped: ${versionSkip}`;
		logSkip(result);
		return result;
	}

	let publishedLibrary: PublishedLibrary | undefined;

	try {
		console.log('Running test %s:%s:%s', result.testsName, result.groupName, result.testName);

		// A library-style test's CQL has to exist on the server before Library/$evaluate can
		// resolve it by canonical url; it is removed again in the finally below.
		if (result.library !== undefined) {
			publishedLibrary = await publishTestLibrary(config.FhirServer.BaseUrl, result.library);
		}

		const data = generateParametersResource(
			result,
			config.FhirServer.CqlOperation,
			publishedLibrary?.canonical
		);

		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		result.responseStatus = response.status;
		const responseBody = await response.json();
		const parsedExpected =
			result.expected !== undefined ? cvl.parse(result.expected) : undefined;
		result.actual = resultExtractor.extract(responseBody, {
			singletonListKeys: ValueMap.singletonListKeysFromExpected(parsedExpected),
		});
		const invalid = result.invalid;
		const erroredOut = responseIndicatesError(response.status, responseBody);

		if (invalid === 'true' || invalid === 'semantic') {
			// The expression is expected to error; it passes only if the engine erred.
			result.testStatus = erroredOut ? 'pass' : 'fail';
		} else if (!erroredOut) {
			result.testStatus = resultsEqual(parsedExpected, result.actual) ? 'pass' : 'fail';
		} else {
			result.testStatus = 'fail';
		}
	} catch (error: any) {
		result.testStatus = 'error';
		result.error = {
			message: error.message,
			name: error.name || 'Error',
			stack: error.stack,
		};
	} finally {
		// Remove the library whether or not evaluation succeeded, so a failing test does not
		// leave a resource behind on the server for the next run to trip over.
		await publishedLibrary?.remove();
	}

	console.log(
		'Test %s:%s:%s status: %s expected: %s actual: %s',
		result.testsName,
		result.groupName,
		result.testName,
		result.testStatus,
		result.expected,
		// String(object) yields "[object Object]", losing list and interval structure, so
		// render the actual in CQL syntax the way the results file does.
		formatActualValue(result.actual)
	);

	return result;
}
