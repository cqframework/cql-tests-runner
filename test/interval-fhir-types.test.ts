import { describe, it, expect, beforeAll } from 'vitest';
import { buildExtractor } from '../src/server/extractor-builder.js';
import { resultsEqual } from '../src/shared/results-utils.js';
import { ValueMap } from '../src/extractors/value-map.js';

/**
 * Covers the FHIR types the "Using CQL with FHIR" IG maps intervals onto (Conformance
 * Requirement 4.3): Interval<Integer|Long|Decimal|Quantity> as FHIR.Range and
 * Interval<Date|DateTime|Time> as FHIR.Period.
 */
const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';

let cvl: any;
let extractor: ReturnType<typeof buildExtractor>;

beforeAll(async () => {
	// @ts-expect-error - cvl.mjs has no declaration file
	cvl = (await import('../cvl/cvl.mjs')).default;
	extractor = buildExtractor();
});

function parameters(parameter: any) {
	return { resourceType: 'Parameters', parameter: [parameter] };
}

/** Extracts a single-parameter response the way runTest does, given the expected CQL literal. */
function extractFor(parameter: any, expectedLiteral: string) {
	const expected = cvl.parse(expectedLiteral);
	const actual = extractor.extract(parameters(parameter), {
		singletonListKeys: ValueMap.singletonListKeysFromExpected(expected),
	});
	return { expected, actual };
}

function cqlType(type: string) {
	return { extension: [{ url: CQL_TYPE_URL, valueString: type }] };
}

describe('Interval<Integer|Decimal> as FHIR.Range', () => {
	it('matches an Integer interval declared by cqf-cqlType', () => {
		const { expected, actual } = extractFor(
			{
				name: 'return',
				...cqlType('Interval<System.Integer>'),
				valueRange: { low: { value: 1 }, high: { value: 10 } },
			},
			'Interval[1, 10]'
		);
		expect(resultsEqual(expected, actual)).toBe(true);
	});

	it('matches a Decimal interval declared by cqf-cqlType', () => {
		const { expected, actual } = extractFor(
			{
				name: 'return',
				...cqlType('Interval<System.Decimal>'),
				valueRange: { low: { value: 1.0 }, high: { value: 10.0 } },
			},
			'Interval[1.0, 10.0]'
		);
		expect(resultsEqual(expected, actual)).toBe(true);
	});

	it('yields plain numbers, not quantities, for a numeric interval', () => {
		const { actual } = extractFor(
			{
				name: 'return',
				...cqlType('Interval<System.Integer>'),
				valueRange: { low: { value: 1 }, high: { value: 10 } },
			},
			'Interval[1, 10]'
		);
		expect(actual).toEqual({ lowClosed: true, low: 1, highClosed: true, high: 10 });
	});
});

describe('Interval<Quantity> as FHIR.Range', () => {
	it('matches a dimensioned quantity interval', () => {
		const { expected, actual } = extractFor(
			{
				name: 'return',
				valueRange: {
					low: { value: 1, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' },
					high: { value: 10, unit: 'mg', system: 'http://unitsofmeasure.org', code: 'mg' },
				},
			},
			"Interval[1 'mg', 10 'mg']"
		);
		expect(resultsEqual(expected, actual)).toBe(true);
	});

	it('falls back to Quantity.unit when a boundary carries no code', () => {
		// Otherwise a dimensioned boundary is silently reduced to a unitless one.
		const { expected, actual } = extractFor(
			{
				name: 'return',
				valueRange: { low: { value: 1, unit: 'mg' }, high: { value: 10, unit: 'mg' } },
			},
			"Interval[1 'mg', 10 'mg']"
		);
		expect(resultsEqual(expected, actual)).toBe(true);
	});
});

describe('Interval<Date|DateTime|Time> as FHIR.Period', () => {
	it('matches a Date interval declared by cqf-cqlType', () => {
		const { expected, actual } = extractFor(
			{
				name: 'return',
				...cqlType('Interval<System.Date>'),
				valuePeriod: { start: '2012-01-01T00:00:00-07:00', end: '2012-12-31T00:00:00-07:00' },
			},
			'Interval[@2012-01-01, @2012-12-31]'
		);
		expect(resultsEqual(expected, actual)).toBe(true);
	});

	it('matches a Time interval anchored to the placeholder date', () => {
		// The IG maps Interval<Time> onto a Period whose boundaries are dateTimes anchored to
		// @0001-01-01; the date and any offset are artifacts of that mapping.
		const { expected, actual } = extractFor(
			{
				name: 'return',
				...cqlType('Interval<System.Time>'),
				valuePeriod: { start: '0001-01-01T01:00:00.000Z', end: '0001-01-01T02:00:00.000Z' },
			},
			'Interval[@T01:00:00.000, @T02:00:00.000]'
		);
		expect(resultsEqual(expected, actual)).toBe(true);
	});

	it('reads an undeclared Period as Interval<DateTime>, per the IG', () => {
		// Without cqf-cqlType the point type cannot be recovered, and the IG says a value with no
		// cqlType is the FHIR type. This documents that a Date interval returned without the
		// extension does NOT match — the omission is the server's to fix, not something to guess at.
		const { expected, actual } = extractFor(
			{
				name: 'return',
				valuePeriod: { start: '2012-01-01T00:00:00-07:00', end: '2012-12-31T00:00:00-07:00' },
			},
			'Interval[@2012-01-01, @2012-12-31]'
		);
		expect(resultsEqual(expected, actual)).toBe(false);
	});
});

describe('boundary and robustness handling', () => {
	it('treats an absent Period end as an unbounded, open high boundary', () => {
		const actual = extractor.extract(
			parameters({ name: 'return', valuePeriod: { start: '2012-01-01' } })
		);
		expect(actual).toMatchObject({ highClosed: false, high: null });
	});

	it('treats an absent Range high the same way', () => {
		const actual = extractor.extract(
			parameters({ name: 'return', valueRange: { low: { value: 1, code: 'mg' } } })
		);
		expect(actual).toMatchObject({ highClosed: false, high: null });
	});

	it('does not throw on a null valuePeriod, valueRange or boundary', () => {
		expect(() =>
			extractor.extract(parameters({ name: 'return', valuePeriod: null }))
		).not.toThrow();
		expect(() =>
			extractor.extract(parameters({ name: 'return', valueRange: null }))
		).not.toThrow();
		expect(() =>
			extractor.extract(
				parameters({ name: 'return', valueRange: { low: null, high: { value: 10, code: 'mg' } } })
			)
		).not.toThrow();
	});

	it('treats a boundary with no value as no boundary', () => {
		const actual = extractor.extract(
			parameters({ name: 'return', valueRange: { low: {}, high: { value: 10, code: 'mg' } } })
		);
		expect(actual).toMatchObject({ lowClosed: false, low: null });
	});
});
