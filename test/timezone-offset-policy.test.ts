import { afterEach, beforeEach, describe, expect, test, vi, Mock } from 'vitest';

import { runTest, type ExecutionContext } from '../src/shared/run-test-core.js';
import { InternalTestResult } from '../src/models/test-types.js';

const NO_DEFAULT_OFFSET = 'timezone-offset-policy.no-default-offset';
const DEFAULT_SERVER_OFFSET = 'timezone-offset-policy.default-server-offset';

/**
 * A context with just enough shape for runTest. The extractor and CVL parser are stubs —
 * these tests are about the timezone policy gate and the offset placeholder, both of which
 * are decided before any result comparison happens.
 */
function context(activeTimeZonePolicy: string, serverOffset = '-06:00'): ExecutionContext {
	return {
		config: { FhirServer: { CqlOperation: '$cql', BaseUrl: 'http://example.org/fhir' } },
		cqlEngine: {
			apiUrl: 'http://example.org/fhir/$cql',
			cqlVersion: '1.5',
			SERVER_OFFSET_ISO: serverOffset,
		},
		cvl: { parse: (expected: any) => expected },
		tests: [],
		resultExtractor: { extract: () => 'extracted' },
		skipMap: new Map(),
		onlySet: new Set(),
		activeTimeZonePolicy,
	} as unknown as ExecutionContext;
}

function result(overrides: Partial<InternalTestResult> = {}): InternalTestResult {
	return {
		testsName: 'CQLTimeZoneOffsetTest',
		groupName: 'Policy',
		testName: 'TimezoneOffsetFrom',
		expression: 'timezoneoffset from @2012-04-01T00:00',
		expected: '-6',
		invalid: 'false',
		capability: [],
		...overrides,
	} as InternalTestResult;
}

describe('timezone offset policy gating', () => {
	let fetchSpy: Mock;

	beforeEach(() => {
		fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
			status: 200,
			json: () => Promise.resolve({ resourceType: 'Parameters', parameter: [] }),
		} as Response) as unknown as Mock;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// A test declaring a policy only has a defined answer under that policy, so it does not
	// apply to a server following the other one and must not be reported as a failure.
	test('skips a test whose required policy is not the one the server follows', async () => {
		const r = result({ capability: [{ code: NO_DEFAULT_OFFSET, value: 'true' }] });

		await runTest(r, context(DEFAULT_SERVER_OFFSET));

		expect(r.testStatus).toBe('skip');
		expect(r.skipMessage).toContain(NO_DEFAULT_OFFSET);
		expect(r.skipMessage).toContain(DEFAULT_SERVER_OFFSET);
		// Skipped before any request is made.
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('runs a test whose required policy matches the server', async () => {
		const r = result({ capability: [{ code: DEFAULT_SERVER_OFFSET, value: 'true' }] });

		await runTest(r, context(DEFAULT_SERVER_OFFSET));

		expect(r.testStatus).not.toBe('skip');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test('runs a test that declares no policy, whatever the server follows', async () => {
		const r = result({ capability: [{ code: 'timezone-offset', value: 'true' }] });

		await runTest(r, context(NO_DEFAULT_OFFSET));

		expect(r.testStatus).not.toBe('skip');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	// The policy is declared on the <group> in CQLTimeZoneOffsetTest.xml and not always
	// restated on the test, so the gate reads the result's merged capabilities.
	test('gates on a policy inherited from the group', async () => {
		const r = result({
			capability: [
				{ code: 'timezone-offset', value: 'true' },
				{ code: NO_DEFAULT_OFFSET, value: 'true' },
			],
		});

		await runTest(r, context(DEFAULT_SERVER_OFFSET));

		expect(r.testStatus).toBe('skip');
		expect(r.skipMessage).toContain(NO_DEFAULT_OFFSET);
	});
});

describe('SERVER_OFFSET_ISO placeholder', () => {
	beforeEach(() => {
		vi.spyOn(global, 'fetch').mockResolvedValue({
			status: 200,
			json: () => Promise.resolve({ resourceType: 'Parameters', parameter: [] }),
		} as Response);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("substitutes the server's offset into the expression", async () => {
		const r = result({ expression: '@2012-04-01T00:00{{SERVER_OFFSET_ISO}}' });

		await runTest(r, context('', '-06:00'));

		expect(r.expression).toBe('@2012-04-01T00:00-06:00');
	});

	test('substitutes every occurrence', async () => {
		const r = result({
			expression: '{{SERVER_OFFSET_ISO}} = {{SERVER_OFFSET_ISO}}',
		});

		await runTest(r, context('', '+05:30'));

		expect(r.expression).toBe('+05:30 = +05:30');
	});

	test('leaves the expression alone when no offset is configured', async () => {
		const r = result({ expression: 'timezoneoffset from @2012-04-01T00:00' });

		await runTest(r, context('', ''));

		expect(r.expression).toBe('timezoneoffset from @2012-04-01T00:00');
	});

	test('records the substituted expression, so what is sent is what is reported', async () => {
		const r = result({ expression: '@2012-04-01T00:00{{SERVER_OFFSET_ISO}}' });

		await runTest(r, context('', '-06:00'));

		const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as any).body);
		const sent = body.parameter.find((p: any) => p.name === 'expression').valueString;
		expect(sent).toBe(r.expression);
		expect(sent).not.toContain('{{SERVER_OFFSET_ISO}}');
	});
});
