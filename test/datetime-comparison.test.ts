import { afterEach, describe, expect, it, vi } from 'vitest';

import { CQLEngine } from '../src/cql-engine/cql-engine.js';
import { buildExtractor } from '../src/server/extractor-builder.js';
import { dateTimeLiteralsEqual } from '../src/shared/datetime-comparison.js';
import { effectiveEvaluationOffsetMinutes } from '../src/shared/evaluation-request-probe.js';
import { Result } from '../src/shared/results-shared.js';
import { resultsEqual } from '../src/shared/results-utils.js';
import { runTest, type ExecutionContext } from '../src/shared/run-test-core.js';

const MDT = -360; // -06:00
const HAS_OFFSET_URL = 'http://hl7.org/fhir/uv/cql/StructureDefinition/time-hasOffset';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('dateTimeLiteralsEqual', () => {
	it('equates the two spellings of UTC (#83)', () => {
		expect(
			dateTimeLiteralsEqual('@9999-12-31T23:59:59.999Z', '@9999-12-31T23:59:59.999+00:00')
		).toBe(true);
	});

	it('reads an offset-less side at the evaluation offset (#84, #138)', () => {
		expect(
			dateTimeLiteralsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30-06:00', MDT)
		).toBe(true);
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30Z', 0)).toBe(
			true
		);
	});

	it('does not equate an offset-less side read at a different evaluation offset', () => {
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30-06:00', 0)).toBe(
			false
		);
	});

	it('keeps the old rule when no evaluation offset is known', () => {
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30-06:00')).toBe(
			false
		);
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30')).toBe(true);
	});

	it('equates the same instant written at different offsets', () => {
		expect(dateTimeLiteralsEqual('@2005-05-10T16:20:30Z', '@2005-05-10T10:20:30-06:00')).toBe(
			true
		);
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30+05:30', '@2005-05-10T04:50:30Z')).toBe(
			true
		);
	});

	it('keeps different instants and different precisions unequal', () => {
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30Z', '@2005-05-10T10:20:31Z')).toBe(false);
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30Z', '@2005-05-10T10:20:30.000Z')).toBe(
			false
		);
		expect(dateTimeLiteralsEqual('@2005-05-10T10', '@2005-05-10T10:00-06:00', MDT)).toBe(false);
	});

	it('keeps years below 100 distinct from 1900–1999', () => {
		expect(
			dateTimeLiteralsEqual('@0001-01-01T00:00:00.000Z', '@1901-01-01T00:00:00.000Z')
		).toBe(false);
		expect(
			dateTimeLiteralsEqual('@0001-01-01T00:00:00.000', '@0001-01-01T00:00:00.000-06:00', MDT)
		).toBe(true);
		// The offset can carry the instant across a year boundary near the minimum.
		expect(dateTimeLiteralsEqual('@0001-01-01T05:00:00Z', '@0000-12-31T23:00:00-06:00')).toBe(
			true
		);
	});

	it('compares fractions to the millisecond', () => {
		expect(dateTimeLiteralsEqual('@2005-05-10T10:20:30.5Z', '@2005-05-10T10:20:30.500Z')).toBe(
			true
		);
	});

	it('leaves anything that is not a DateTime with a time to the caller', () => {
		for (const [e, a] of [
			['@2014-01-01', '@2014-01-01'],
			['@2014-01-01T', '@2014-01-01T'],
			['@T10:20:30', '@T10:20:30'],
			["'2005-05-10T10:20:30'", '@2005-05-10T10:20:30Z'],
			['abc', 'abc'],
		]) {
			expect(dateTimeLiteralsEqual(e, a, MDT), `${e} / ${a}`).toBeUndefined();
		}
	});
});

describe('resultsEqual with an evaluation offset', () => {
	const options = { evaluationOffsetMinutes: MDT };

	it('applies to scalars, lists, tuples and interval boundaries', () => {
		expect(resultsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30-06:00', options)).toBe(
			true
		);
		expect(
			resultsEqual(
				['@2005-05-10T10:20:30', '@2005-05-11T10:20:30'],
				['@2005-05-10T10:20:30-06:00', '@2005-05-11T10:20:30-06:00'],
				options
			)
		).toBe(true);
		expect(
			resultsEqual(
				{ at: '@2005-05-10T10:20:30' },
				{ at: '@2005-05-10T10:20:30-06:00' },
				options
			)
		).toBe(true);
		expect(
			resultsEqual(
				{
					lowClosed: true,
					low: '@2016-05-01T00:00:00.000',
					highClosed: true,
					high: '@2016-05-02T00:00:00.000',
				},
				{
					lowClosed: true,
					low: '@2016-05-01T00:00:00.000-06:00',
					highClosed: true,
					high: '@2016-05-02T00:00:00.000-06:00',
				},
				options
			)
		).toBe(true);
	});

	it('changes nothing without the option', () => {
		expect(resultsEqual('@2005-05-10T10:20:30', '@2005-05-10T10:20:30-06:00')).toBe(false);
		expect(resultsEqual('abc', 'abd', options)).toBe(false);
	});
});

describe('time-hasOffset', () => {
	const extract = (parameter: any) =>
		buildExtractor().extract({
			resourceType: 'Parameters',
			parameter: [{ name: 'return', ...parameter }],
		});
	const hasOffset = (value: boolean) => ({
		extension: [{ url: HAS_OFFSET_URL, valueBoolean: value }],
	});

	it('drops an offset the extension marks as an artifact', () => {
		expect(
			extract({
				valueDateTime: '2005-05-10T10:20:30-06:00',
				_valueDateTime: hasOffset(false),
			})
		).toBe('@2005-05-10T10:20:30');
	});

	it('keeps a real offset', () => {
		expect(
			extract({ valueDateTime: '2005-05-10T10:20:30-06:00', _valueDateTime: hasOffset(true) })
		).toBe('@2005-05-10T10:20:30-06:00');
		expect(extract({ valueDateTime: '2005-05-10T10:20:30-06:00' })).toBe(
			'@2005-05-10T10:20:30-06:00'
		);
	});

	it('applies to Period boundaries', () => {
		expect(
			extract({
				valuePeriod: {
					start: '2016-05-01T00:00:00-06:00',
					_start: hasOffset(false),
					end: '2016-05-02T00:00:00-06:00',
				},
			})
		).toEqual({
			lowClosed: true,
			low: '@2016-05-01T00:00:00',
			highClosed: true,
			high: '@2016-05-02T00:00:00-06:00',
		});
	});
});

describe('effectiveEvaluationOffsetMinutes', () => {
	const support = (serverTimezoneOffset: string | null) => ({
		defaultTimezoneOffset: 'Z',
		timestampParameterHonored: false,
		timezoneHeaderHonored: false,
		serverTimezoneOffset,
	});

	it("uses the server's own offset when it ignores the request", () => {
		expect(effectiveEvaluationOffsetMinutes(support('-06:00'), 0)).toBe(MDT);
	});

	it('otherwise uses the requested offset', () => {
		expect(effectiveEvaluationOffsetMinutes(support(null), 330)).toBe(330);
		expect(effectiveEvaluationOffsetMinutes(undefined, 0)).toBe(0);
	});
});

describe('runTest against a server that ignores the requested offset', () => {
	function context(serverTimezoneOffset: string | null): ExecutionContext {
		vi.spyOn(global, 'fetch').mockResolvedValue({
			status: 200,
			json: async () => ({
				resourceType: 'Parameters',
				parameter: [{ name: 'return', valueDateTime: '2005-05-10T10:20:30-06:00' }],
			}),
		} as any);
		const cqlEngine = new CQLEngine('http://localhost:8080/fhir', '$cql');
		cqlEngine.evaluationRequestSupport = {
			defaultTimezoneOffset: 'Z',
			timestampParameterHonored: false,
			timezoneHeaderHonored: false,
			serverTimezoneOffset,
		};
		return {
			config: {
				FhirServer: { BaseUrl: 'http://localhost:8080/fhir', CqlOperation: '$cql' },
			} as any,
			cqlEngine,
			cvl: { parse: (text: string) => text },
			tests: [],
			resultExtractor: buildExtractor(),
			skipMap: new Map(),
			onlySet: new Set(),
			runInstant: new Date('2026-10-01T17:00:00.000Z'),
		};
	}

	const test = () =>
		new Result('Suite', 'Group', {
			name: 'DateTimeAdd5Seconds',
			expression: '@2005-05-10T10:20:25 + 5 seconds',
			output: '@2005-05-10T10:20:30',
		});

	it("passes when the result matches at the server's actual offset", async () => {
		const result = await runTest(test(), context('-06:00'));
		expect(result.testStatus).toBe('pass');
	});

	it('fails when the offset the evaluation ran at is unknown', async () => {
		const result = await runTest(test(), context(null));
		expect(result.testStatus).toBe('fail');
	});
});
