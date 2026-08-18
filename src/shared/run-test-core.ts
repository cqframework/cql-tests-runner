import { ConfigLoader } from '../conf/config-loader.js';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { TestLoader } from '../loaders/test-loader.js';
import { generateParametersResource, responseIndicatesError } from './results-shared.js';
import { InternalTestResult, Tests } from '../models/test-types.js';
import { ServerConnectivity } from './server-connectivity.js';
import { ResultExtractor } from '../extractors/result-extractor.js';
import { buildExtractor } from '../server/extractor-builder.js';
import { createConfigFromData } from '../server/config-utils.js';
import { ValueMap } from '../extractors/value-map.js';
import { resultsEqual } from './results-utils.js';
import { formatActualValue } from '../test-results/cql-test-results.js';

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
	/**
	 * The timezone-offset policy this server follows, resolved once per run. Tests that
	 * declare a `timezone-offset-policy.*` capability only apply under the matching policy.
	 */
	activeTimeZonePolicy: string;
}

/** Policies a server can follow for DateTime values authored without an offset. */
const NO_DEFAULT_OFFSET = 'timezone-offset-policy.no-default-offset';
const DEFAULT_SERVER_OFFSET = 'timezone-offset-policy.default-server-offset';
const TIME_ZONE_POLICIES = [NO_DEFAULT_OFFSET, DEFAULT_SERVER_OFFSET];

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

	// Resolving the policy costs a metadata request and possibly a probe expression, so only
	// do it when the loaded suite actually contains policy-dependent tests. Most suites do
	// not, and those runs should not pay for a feature they never consult.
	let activeTimeZonePolicy = '';
	if (suiteDeclaresTimeZonePolicy(tests)) {
		if (typeof cqlEngine.fetch === 'function') {
			await cqlEngine.fetch();
		}
		activeTimeZonePolicy = await resolveTimeZoneOffsetPolicy(
			config,
			cqlEngine.apiUrl!,
			cqlEngine.serverMetadata
		);
		console.log('Resolved timezone offset policy: %s', activeTimeZonePolicy);
	}

	return {
		config,
		cqlEngine,
		cvl,
		tests,
		resultExtractor,
		skipMap,
		onlySet,
		activeTimeZonePolicy,
	};
}

/**
 * True when any loaded test or group declares a `timezone-offset-policy.*` capability.
 * Gates the policy resolution below, which is otherwise wasted work.
 */
function suiteDeclaresTimeZonePolicy(tests: Tests[]): boolean {
	const declares = (capability: any): boolean => {
		const declared = Array.isArray(capability) ? capability : capability ? [capability] : [];
		return declared.some((c: any) => c?.code?.startsWith('timezone-offset-policy.'));
	};

	return tests.some(suite =>
		suite.group?.some(
			group =>
				declares(group.capability) || group.test?.some(test => declares(test.capability))
		)
	);
}

/**
 * Determines which timezone-offset policy the server follows, in decreasing order of
 * authority: what the server declares in its CapabilityStatement, what the operator
 * configured, what a probe expression reveals, and finally the more common default.
 */
async function resolveTimeZoneOffsetPolicy(
	config: ConfigLoader,
	apiUrl: string,
	serverMetadata?: any
): Promise<string> {
	const declared = timeZonePolicyFromMetadata(serverMetadata);
	if (declared) {
		return declared;
	}

	const configured =
		process.env.TIME_ZONE_OFFSET_POLICY?.trim() || config.Build?.TimeZoneOffsetPolicy?.trim();
	if (configured) {
		return configured;
	}

	const probed = await probeTimeZoneOffsetPolicy(apiUrl);
	if (probed) {
		return probed;
	}

	return DEFAULT_SERVER_OFFSET;
}

/**
 * Asks the engine for the timezone offset of an offset-less DateTime. A server that
 * defaults to its own offset returns a number; one that does not returns null.
 */
async function probeTimeZoneOffsetPolicy(apiUrl: string): Promise<string | null> {
	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				resourceType: 'Parameters',
				parameter: [
					{ name: 'expression', valueString: 'timezoneoffset from @2012-04-01T00:00' },
				],
			}),
		});

		if (response.status !== 200) {
			return null;
		}

		const probed = probeResultValue(await response.json());

		if (typeof probed === 'number') {
			return DEFAULT_SERVER_OFFSET;
		}
		if (typeof probed === 'string') {
			const trimmed = probed.trim().toLowerCase();
			if (trimmed === 'null') {
				return NO_DEFAULT_OFFSET;
			}
			if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
				return DEFAULT_SERVER_OFFSET;
			}
		}
		if (probed === null) {
			return NO_DEFAULT_OFFSET;
		}
	} catch {
		// A server that cannot answer the probe tells us nothing; fall through to the caller's
		// next source rather than failing the whole run.
	}

	return null;
}

/** The scalar the probe expression evaluated to, whatever primitive type it came back as. */
function probeResultValue(responseBody: any): any {
	const parameters = responseBody?.parameter;
	if (!Array.isArray(parameters) || parameters.length === 0) {
		return undefined;
	}

	const returned = parameters.find((p: any) => p?.name === 'return') ?? parameters[0];

	for (const key of ['valueInteger', 'valueDecimal', 'valueString', 'valueBoolean'] as const) {
		if (returned?.[key] !== undefined) {
			return returned[key];
		}
	}

	// An explicit null result is reported as a parameter with no value at all.
	return null;
}

/** Searches a CapabilityStatement for a declared timezone-offset policy code. */
function timeZonePolicyFromMetadata(metadata: any): string | null {
	if (!metadata || typeof metadata !== 'object') {
		return null;
	}

	const search = (node: any): string | null => {
		if (!node || typeof node !== 'object') {
			return null;
		}
		if (Array.isArray(node)) {
			for (const item of node) {
				const found = search(item);
				if (found) return found;
			}
			return null;
		}
		for (const value of Object.values(node)) {
			if (typeof value === 'string' && TIME_ZONE_POLICIES.includes(value)) {
				return value;
			}
			const found = search(value);
			if (found) return found;
		}
		return null;
	};

	return search(metadata);
}

/**
 * The timezone-offset policy a test requires, if it declares one. Read from the result's
 * capabilities, which include those inherited from the enclosing group.
 */
function requiredTimeZonePolicy(result: InternalTestResult): string | undefined {
	return result.capability?.find(c => c.code?.startsWith('timezone-offset-policy.'))?.code;
}

/**
 * Substitutes the server's own offset for the `{{SERVER_OFFSET_ISO}}` placeholder that
 * offset-dependent tests use, so one test can express the expectation for any server.
 */
function replaceServerOffsetPlaceholder(expression: string, serverOffsetISO: string): string {
	return expression.replace(/\{\{SERVER_OFFSET_ISO\}\}/g, serverOffsetISO);
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
	const { config, cqlEngine, cvl, resultExtractor, skipMap, onlySet, activeTimeZonePolicy } = ctx;
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
	}

	// Version gating — applies to both the CLI and server paths.
	const versionSkip = versionSkipReason(cqlEngine.cqlVersion, result);
	if (versionSkip) {
		result.testStatus = 'skip';
		result.skipMessage = `Skipped: ${versionSkip}`;
		logSkip(result);
		return result;
	}

	// A test that declares a timezone-offset policy only has a defined answer under that
	// policy, so it does not apply to a server following the other one.
	const requiredPolicy = requiredTimeZonePolicy(result);
	if (requiredPolicy !== undefined && requiredPolicy !== activeTimeZonePolicy) {
		result.testStatus = 'skip';
		result.skipMessage = `Skipped: requires ${requiredPolicy} but the server follows ${activeTimeZonePolicy}`;
		logSkip(result);
		return result;
	}

	// Resolve the offset placeholder before the request is built, so the expression that is
	// sent and the expression recorded in the results are the same string.
	const serverOffset = cqlEngine.SERVER_OFFSET_ISO;
	if (typeof serverOffset === 'string' && serverOffset.trim() !== '') {
		result.expression = replaceServerOffsetPlaceholder(result.expression, serverOffset);
	}

	const data = generateParametersResource(result, config.FhirServer.CqlOperation);

	try {
		console.log('Running test %s:%s:%s', result.testsName, result.groupName, result.testName);

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
