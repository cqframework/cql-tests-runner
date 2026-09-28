import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResultsValidator } from '../src/conf/results-validator.js';
import { CQLEngine } from '../src/cql-engine/cql-engine.js';
import {
	formatInstantAtOffset,
	parseTimezoneOffset,
	resolveEvaluationTiming,
} from '../src/shared/evaluation-context.js';
import { probeEvaluationRequestSupport } from '../src/shared/evaluation-request-probe.js';
import { generateParametersResource, Result } from '../src/shared/results-shared.js';
import { runTest, type ExecutionContext } from '../src/shared/run-test-core.js';
import { CQLTestResults } from '../src/test-results/cql-test-results.js';

const RUN_INSTANT = new Date('2026-09-28T17:30:00.123Z');

afterEach(() => {
	vi.restoreAllMocks();
});

describe('parseTimezoneOffset', () => {
	it('reads FHIR/ISO offsets', () => {
		expect(parseTimezoneOffset('Z')).toBe(0);
		expect(parseTimezoneOffset('+00:00')).toBe(0);
		expect(parseTimezoneOffset('-06:00')).toBe(-360);
		expect(parseTimezoneOffset('+05:45')).toBe(345);
	});

	it('reads CQL-style decimal hours', () => {
		expect(parseTimezoneOffset('-6')).toBe(-360);
		expect(parseTimezoneOffset('-6.0')).toBe(-360);
		expect(parseTimezoneOffset('5.5')).toBe(330);
		expect(parseTimezoneOffset('+5.75')).toBe(345);
	});

	it('rejects anything else, including offsets beyond ±14:00', () => {
		for (const value of ['', 'UTC', '06:00', '-6:00', '+05:60', '+15:00', '-14.5', 'abc']) {
			expect(parseTimezoneOffset(value), value).toBeUndefined();
		}
	});
});

describe('resolveEvaluationTiming', () => {
	it('defaults to the run instant in UTC', () => {
		expect(resolveEvaluationTiming({}, RUN_INSTANT)).toEqual({
			ok: true,
			timestamp: '2026-09-28T17:30:00.123Z',
			offsetMinutes: 0,
		});
	});

	it('expresses the run instant in the test offset', () => {
		expect(
			resolveEvaluationTiming({ evaluationTimezoneOffset: '-06:00' }, RUN_INSTANT)
		).toEqual({
			ok: true,
			timestamp: '2026-09-28T11:30:00.123-06:00',
			offsetMinutes: -360,
		});
		expect(
			resolveEvaluationTiming({ evaluationTimezoneOffset: '5.5' }, RUN_INSTANT)
		).toMatchObject({
			timestamp: '2026-09-28T23:00:00.123+05:30',
		});
	});

	it('uses the test evaluationDateTime as given, normalized to a FHIR dateTime', () => {
		expect(
			resolveEvaluationTiming(
				{ evaluationDateTime: '@2014-01-01T23:30:00-06:00' },
				RUN_INSTANT
			)
		).toEqual({ ok: true, timestamp: '2014-01-01T23:30:00-06:00', offsetMinutes: -360 });
		// Seconds are added, and a missing offset takes the default.
		expect(
			resolveEvaluationTiming({ evaluationDateTime: '2014-01-01T10:20' }, RUN_INSTANT)
		).toMatchObject({ timestamp: '2014-01-01T10:20:00Z' });
	});

	it('rejects a test that specifies both attributes', () => {
		const timing = resolveEvaluationTiming(
			{ evaluationDateTime: '2014-01-01T00:00:00Z', evaluationTimezoneOffset: 'Z' },
			RUN_INSTANT
		);
		expect(timing).toMatchObject({ ok: false, message: expect.stringMatching(/both/) });
	});

	it('rejects unusable values', () => {
		for (const evaluationDateTime of [
			'2014-01-01',
			'2014-13-01T00:00:00Z',
			'2014-02-30T00:00:00Z',
			'2014-01-01T00:00:00+15:00',
		]) {
			expect(
				resolveEvaluationTiming({ evaluationDateTime }, RUN_INSTANT).ok,
				evaluationDateTime
			).toBe(false);
		}
		expect(resolveEvaluationTiming({ evaluationTimezoneOffset: 'EST' }, RUN_INSTANT).ok).toBe(
			false
		);
	});

	it('formats instants across a date boundary', () => {
		expect(formatInstantAtOffset(new Date('2026-01-01T00:30:00Z'), -360)).toBe(
			'2025-12-31T18:30:00.000-06:00'
		);
	});
});

describe('generateParametersResource', () => {
	const result = new Result('Suite', 'Group', { name: 'Test', expression: 'Now()', output: 'x' });

	it('appends the timestamp parameter for every operation shape', () => {
		const timestamp = '2026-09-28T17:30:00.123Z';
		const expected = { name: 'timestamp', valueDateTime: timestamp };
		expect(
			generateParametersResource(result, '$cql', undefined, timestamp).parameter
		).toContainEqual(expected);
		expect(
			generateParametersResource(result, '$evaluate', undefined, timestamp).parameter
		).toContainEqual(expected);

		const libraryResult = new Result('Suite', 'Group', {
			name: 'Test',
			library: 'library L',
			output: { text: 'x', name: 'Out' },
		});
		expect(
			generateParametersResource(
				libraryResult,
				'$evaluate',
				'http://example.org/Library/L',
				timestamp
			).parameter
		).toContainEqual(expected);
	});

	it('sends no timestamp when none is given', () => {
		const names = generateParametersResource(result, '$cql').parameter!.map(p => p.name);
		expect(names).toEqual(['expression']);
	});
});

function contextFor(fetchImpl: (...args: any[]) => any): ExecutionContext {
	vi.spyOn(global, 'fetch').mockImplementation(fetchImpl as any);
	const cqlEngine = new CQLEngine('http://localhost:8080/fhir', '$cql');
	return {
		config: {
			FhirServer: { BaseUrl: 'http://localhost:8080/fhir', CqlOperation: '$cql' },
		} as any,
		cqlEngine,
		cvl: { parse: (text: string) => (text === 'true' ? true : text) },
		tests: [],
		resultExtractor: { extract: () => true } as any,
		skipMap: new Map(),
		onlySet: new Set(),
		runInstant: RUN_INSTANT,
	};
}

const okResponse = () =>
	Promise.resolve({
		status: 200,
		json: () => Promise.resolve({ resourceType: 'Parameters', parameter: [] }),
	});

describe('runTest', () => {
	it('sends the evaluation timestamp as a parameter and a Timezone header, and records it', async () => {
		const ctx = contextFor(okResponse);
		const result = new Result('Suite', 'Group', {
			name: 'Test',
			expression: 'true',
			output: 'true',
			evaluationTimezoneOffset: '-06:00',
		});

		await runTest(result, ctx);

		const [, init] = (global.fetch as any).mock.calls[0];
		expect(init.headers.Timezone).toBe('2026-09-28T11:30:00.123-06:00');
		expect(JSON.parse(init.body).parameter).toContainEqual({
			name: 'timestamp',
			valueDateTime: '2026-09-28T11:30:00.123-06:00',
		});
		expect(result.evaluationTimestamp).toBe('2026-09-28T11:30:00.123-06:00');
		expect(result.testStatus).toBe('pass');
	});

	it('scores a test that specifies both attributes as an error without calling the server', async () => {
		const ctx = contextFor(okResponse);
		const result = new Result('Suite', 'Group', {
			name: 'Test',
			expression: 'true',
			output: 'true',
			evaluationDateTime: '2014-01-01T00:00:00Z',
			evaluationTimezoneOffset: 'Z',
		});

		await runTest(result, ctx);

		expect(result.testStatus).toBe('error');
		expect(result.error?.message).toMatch(
			/both evaluationDateTime and evaluationTimezoneOffset/
		);
		expect(global.fetch).not.toHaveBeenCalled();
	});
});

describe('probeEvaluationRequestSupport', () => {
	function server(options: { honourTimestamp: boolean; honourHeader: boolean }) {
		return vi.spyOn(global, 'fetch').mockImplementation((async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			const expression = body.parameter.find((p: any) => p.name === 'expression').valueString;
			const timestamp = body.parameter.find(
				(p: any) => p.name === 'timestamp'
			)?.valueDateTime;
			const value =
				expression === 'Now()'
					? options.honourTimestamp && timestamp
						? timestamp
						: '2026-09-28T10:04:26.825-06:00'
					: options.honourHeader
						? `2005-05-10T10:20:30${init.headers.Timezone.slice(-6)}`
						: '2005-05-10T10:20:30-06:00';
			return {
				status: 200,
				json: async () => ({
					resourceType: 'Parameters',
					parameter: [{ name: 'return', valueDateTime: value }],
				}),
			};
		}) as any);
	}

	it('detects a server that ignores both (as HAPI FHIR 8.10 does)', async () => {
		server({ honourTimestamp: false, honourHeader: false });
		expect(await probeEvaluationRequestSupport('http://x/$cql', '$cql')).toEqual({
			defaultTimezoneOffset: 'Z',
			timestampParameterHonored: false,
			timezoneHeaderHonored: false,
		});
	});

	it('detects each mechanism separately', async () => {
		server({ honourTimestamp: true, honourHeader: false });
		expect(await probeEvaluationRequestSupport('http://x/$cql', '$cql')).toMatchObject({
			timestampParameterHonored: true,
			timezoneHeaderHonored: false,
		});
		vi.restoreAllMocks();
		server({ honourTimestamp: false, honourHeader: true });
		expect(await probeEvaluationRequestSupport('http://x/$cql', '$cql')).toMatchObject({
			timestampParameterHonored: false,
			timezoneHeaderHonored: true,
		});
	});

	it('reports unknown when the probe fails, or for Library/$evaluate', async () => {
		vi.spyOn(global, 'fetch').mockRejectedValue(new Error('down'));
		expect(await probeEvaluationRequestSupport('http://x/$cql', '$cql')).toMatchObject({
			timestampParameterHonored: null,
			timezoneHeaderHonored: null,
		});
		expect(
			await probeEvaluationRequestSupport('http://x/Library/$evaluate', '$evaluate')
		).toEqual({
			defaultTimezoneOffset: 'Z',
			timestampParameterHonored: null,
			timezoneHeaderHonored: null,
		});
	});
});

describe('results file', () => {
	it('records the evaluation timestamp and probe outcome, and still validates', () => {
		const engine = new CQLEngine('http://localhost:8080/fhir', '$cql');
		engine.evaluationRequestSupport = {
			defaultTimezoneOffset: 'Z',
			timestampParameterHonored: false,
			timezoneHeaderHonored: null,
		};
		const results = new CQLTestResults(engine);
		const result = new Result('Suite', 'Group', {
			name: 'Test',
			expression: 'true',
			output: 'true',
		});
		result.testStatus = 'pass';
		result.evaluationTimestamp = '2026-09-28T17:30:00.123Z';
		results.add(result);

		const json: any = results.toJSON();
		expect(json.evaluationRequest).toEqual(engine.evaluationRequestSupport);
		expect(json.results[0].evaluationTimestamp).toBe('2026-09-28T17:30:00.123Z');

		const validation = new ResultsValidator().validateResults(JSON.parse(JSON.stringify(json)));
		expect(validation.errors).toEqual([]);
		expect(validation.isValid).toBe(true);
	});
});
