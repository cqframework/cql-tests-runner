import { beforeAll, expect, test } from 'vitest';

import { ResultExtractor } from '../src/extractors/result-extractor.js';
import { ValueMap } from '../src/extractors/value-map.js';
import { buildExtractor } from '../src/server/extractor-builder.js';
import { getIntervalMeta } from '../src/shared/interval-utils.js';

const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';
const PRECISION_URL = 'http://hl7.org/fhir/StructureDefinition/quantity-precision';
const UCUM_SYSTEM = 'http://unitsofmeasure.org';

let extractor: ResultExtractor | null = null;

beforeAll(() => {
	extractor = buildExtractor();
});

function extractRange(range: any, extension?: any[]): any {
	return extractor!.extract({
		resourceType: 'Parameters',
		parameter: [
			{
				name: 'return',
				...(extension === undefined ? {} : { extension: extension }),
				valueRange: range,
			},
		],
	});
}

test('boolean response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueBoolean: true,
				},
			],
		})
	).toBe(true);
});

test('integer response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueInteger: 1,
				},
			],
		})
	).toBe(1);
});

test('decimal(0.1) response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDecimal: 0.1,
				},
			],
		})
	).toBe(0.1);
});

test('decimal(1.0) response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDecimal: 1.0,
				},
			],
		})
	).toBe(1.0);
});

test('decimal(1.1) response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDecimal: 1.1,
				},
			],
		})
	).toBe(1.1);
});

test('decimal(-0.1) response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDecimal: -0.1,
				},
			],
		})
	).toBe(-0.1);
});

test('string response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueString: 'abc',
				},
			],
		})
	).toBe('abc');
});

test('singleton list-typed return stays array when singletonListKeys includes return (issue #82)', () => {
	expect(
		extractor!.extract(
			{
				resourceType: 'Parameters',
				parameter: [
					{
						name: 'return',
						valueString: 'a',
					},
				],
			},
			{ singletonListKeys: new Set(['return']) }
		)
	).toEqual(['a']);
});

test('FHIR empty list stays [] when expected is empty list (issue #90)', () => {
	const emptyListParameters = {
		resourceType: 'Parameters',
		parameter: [
			{
				name: 'return',
				extension: [
					{
						url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
						valueString: 'List<System.Any>',
					},
				],
				_valueBoolean: {
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList',
							valueBoolean: true,
						},
					],
				},
			},
		],
	};
	expect(
		extractor!.extract(emptyListParameters, {
			singletonListKeys: ValueMap.singletonListKeysFromExpected([]),
		})
	).toEqual([]);
});

test('date response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDate: '2025-01-01',
				},
			],
		})
	).toBe('@2025-01-01');
});

test('datetime response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDate: '2025-01-01T12:34:56.789',
				},
			],
		})
	).toBe('@2025-01-01T12:34:56.789');
});

test('time response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueTime: '12:30:00.000',
				},
			],
		})
	).toBe('@T12:30:00.000');
});

test('quantity response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueQuantity: {
						value: 123,
						unit: 'kg',
						system: 'http://unitsofmeasure.org',
						code: 'kg',
					},
				},
			],
		})
	).toStrictEqual({ value: 123, unit: 'kg' });
});

test('ratio of integers response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueRatio: {
						numerator: {
							value: 1,
							unit: '1',
							system: 'http://unitsofmeasure.org',
							code: '1',
						},
						denominator: {
							value: 2,
							unit: '1',
							system: 'http://unitsofmeasure.org',
							code: '1',
						},
					},
				},
			],
		})
	).toStrictEqual({ numerator: { value: 1, unit: '1' }, denominator: { value: 2, unit: '1' } });
});

test('ratio of quantity response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueRatio: {
						numerator: {
							value: 1,
							unit: 'ml',
							system: 'http://unitsofmeasure.org',
							code: 'ml',
						},
						denominator: {
							value: 2,
							unit: 'ml',
							system: 'http://unitsofmeasure.org',
							code: 'ml',
						},
					},
				},
			],
		})
	).toStrictEqual({ numerator: { value: 1, unit: 'ml' }, denominator: { value: 2, unit: 'ml' } });
});

test('null response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					_valueBoolean: {
						extension: [
							{
								url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason',
								valueCode: 'unknown',
							},
						],
					},
				},
			],
		})
	).toBe(null);
});

test('error response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'evaluation error',
					resource: {
						resourceType: 'OperationOutcome',
						issue: [
							{
								severity: 'error',
								details: {
									text: 'library expression loaded, but had errors: Could not resolve call to operator Expand with signature (list<interval<System.Integer>>,System.Decimal).',
								},
							},
						],
					},
				},
			],
		})
	).toBe(
		'EvaluationError:library expression loaded, but had errors: Could not resolve call to operator Expand with signature (list<interval<System.Integer>>,System.Decimal).'
	);
});

test('evaluation error uses diagnostics when details.text is absent', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'evaluation error',
					resource: {
						resourceType: 'OperationOutcome',
						issue: [{ severity: 'error', diagnostics: 'CQL engine message' }],
					},
				},
			],
		})
	).toBe('EvaluationError:CQL engine message');
});

test('evaluation error does not throw when resource shape is minimal', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'evaluation error',
					resource: { resourceType: 'OperationOutcome', issue: [] },
				},
			],
		})
	).toBe('EvaluationError:{"resourceType":"OperationOutcome","issue":[]}');
});

test('period datetime response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valuePeriod: {
						start: '2025-01-01T00:00:00-05:00',
						end: '2025-12-31T00:00:00-05:00',
					},
				},
			],
		})
	).toStrictEqual({
		low: '@2025-01-01T00:00:00-05:00',
		lowClosed: true,
		high: '@2025-12-31T00:00:00-05:00',
		highClosed: true,
	});
});

// FHIR Period boundaries are dateTimes, so an Interval<System.Time> arrives with its
// times anchored to a placeholder date; the cqf-cqlType extension identifies the real
// point type and the date anchor is stripped back off.
test('period with Interval<System.Time> cqlType yields time literals', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
							valueString: 'Interval<System.Time>',
						},
					],
					valuePeriod: {
						start: '0001-01-01T00:00:00.000',
						end: '0001-01-01T23:59:59.599',
					},
				},
			],
		})
	).toStrictEqual({
		lowClosed: true,
		low: '@T00:00:00.000',
		highClosed: true,
		high: '@T23:59:59.599',
	});
});

test('time interval cqlType matches without the System prefix and strips offsets', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
							valueString: 'Interval<Time>',
						},
					],
					valuePeriod: {
						start: '0001-01-01T00:00:00.000+00:00',
						end: '0001-01-01T23:59:59.599Z',
					},
				},
			],
		})
	).toStrictEqual({
		lowClosed: true,
		low: '@T00:00:00.000',
		highClosed: true,
		high: '@T23:59:59.599',
	});
});

test('time interval with a missing boundary keeps the null/closed handling', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
							valueString: 'Interval<System.Time>',
						},
					],
					valuePeriod: {
						end: '0001-01-01T23:59:59.599',
					},
				},
			],
		})
	).toStrictEqual({
		lowClosed: false,
		low: null,
		highClosed: true,
		high: '@T23:59:59.599',
	});
});

// A date interval's Period boundaries are date strings (or dateTimes with an anchored
// time part); without the cqf-cqlType extension they would be formatted as DateTime
// literals (@2018-01-01T), which never match expected Date literals (@2018-01-01).
test('period with Interval<System.Date> cqlType yields date literals', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
							valueString: 'Interval<System.Date>',
						},
					],
					valuePeriod: {
						start: '2018-01-01',
						end: '2018-01-04',
					},
				},
			],
		})
	).toStrictEqual({
		lowClosed: true,
		low: '@2018-01-01',
		highClosed: true,
		high: '@2018-01-04',
	});
});

test('date interval strips an anchored time part from Period boundaries', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
							valueString: 'Interval<Date>',
						},
					],
					valuePeriod: {
						start: '2018-01-01T00:00:00.000',
						end: '2018-01-04T00:00:00.000',
					},
				},
			],
		})
	).toStrictEqual({
		lowClosed: true,
		low: '@2018-01-01',
		highClosed: true,
		high: '@2018-01-04',
	});
});

test('list of date intervals (ExpandPerDay) yields date-literal boundaries', () => {
	const dateInterval = (start: string, end: string) => ({
		name: 'return',
		extension: [
			{
				url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
				valueString: 'Interval<System.Date>',
			},
		],
		valuePeriod: { start: start, end: end },
	});

	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				dateInterval('2018-01-01', '2018-01-01'),
				dateInterval('2018-01-02', '2018-01-02'),
				dateInterval('2018-01-03', '2018-01-03'),
				dateInterval('2018-01-04', '2018-01-04'),
			],
		})
	).toStrictEqual([
		{ lowClosed: true, low: '@2018-01-01', highClosed: true, high: '@2018-01-01' },
		{ lowClosed: true, low: '@2018-01-02', highClosed: true, high: '@2018-01-02' },
		{ lowClosed: true, low: '@2018-01-03', highClosed: true, high: '@2018-01-03' },
		{ lowClosed: true, low: '@2018-01-04', highClosed: true, high: '@2018-01-04' },
	]);
});

test('period with a non-time cqlType still yields datetime literals', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType',
							valueString: 'Interval<System.DateTime>',
						},
					],
					valuePeriod: {
						start: '2025-01-01T00:00:00-05:00',
						end: '2025-12-31T00:00:00-05:00',
					},
				},
			],
		})
	).toStrictEqual({
		lowClosed: true,
		low: '@2025-01-01T00:00:00-05:00',
		highClosed: true,
		high: '@2025-12-31T00:00:00-05:00',
	});
});

test('code response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueCoding: {
						system: 'http://loinc.org',
						version: '1.0',
						code: '8480-6',
						display: 'Systolic blood pressure',
					},
				},
			],
		})
	).toStrictEqual({
		code: '8480-6',
		display: 'Systolic blood pressure',
		system: 'http://loinc.org',
		version: '1.0',
	});
});

test('code response check missing properties', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueCoding: {
						system: 'http://loinc.org',
						code: '8480-6',
						display: 'Systolic blood pressure',
					},
				},
			],
		})
	).toStrictEqual({
		code: '8480-6',
		display: 'Systolic blood pressure',
		system: 'http://loinc.org',
	});
});

test('concept response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueCodeableConcept: {
						coding: [
							{
								system: 'http://loinc.org',
								version: '1.0',
								code: '8480-6',
								display: 'Systolic blood pressure',
							},
							{
								system: 'http://loinc.org',
								version: '1.0',
								code: '8462-4',
								display: 'Diastolic blood pressure',
							},
						],
					},
				},
			],
		})
	).toStrictEqual({
		codes: [
			{
				code: '8480-6',
				display: 'Systolic blood pressure',
				system: 'http://loinc.org',
				version: '1.0',
			},
			{
				code: '8462-4',
				display: 'Diastolic blood pressure',
				system: 'http://loinc.org',
				version: '1.0',
			},
		],
		display: undefined,
	});
});

test('tuple response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					part: [
						{
							name: 'name',
							valueString: 'Patrick',
						},
						{
							name: 'birthDate',
							valueDate: '2014-01-01',
						},
					],
				},
			],
		})
	).toStrictEqual({ name: 'Patrick', birthDate: '@2014-01-01' });
});

test('tuple response carries no interval metadata', () => {
	const result = extractor!.extract({
		resourceType: 'Parameters',
		parameter: [
			{
				name: 'return',
				part: [
					{
						name: 'name',
						valueString: 'Patrick',
					},
					{
						name: 'birthDate',
						valueDate: '2014-01-01',
					},
				],
			},
		],
	});
	expect(getIntervalMeta(result)).toBeUndefined();
});

test('list of integers response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueInteger: 1,
				},
				{
					name: 'return',
					valueInteger: 2,
				},
				{
					name: 'return',
					valueInteger: 3,
				},
			],
		})
	).toStrictEqual([1, 2, 3]);
});

test('list of decimals response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueDecimal: 1.0,
				},
				{
					name: 'return',
					valueDecimal: 2.0,
				},
				{
					name: 'return',
					valueDecimal: 3.0,
				},
			],
		})
	).toStrictEqual([1.0, 2.0, 3.0]);
});

test('list of strings response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					valueString: 'a',
				},
				{
					name: 'return',
					valueString: 'b',
				},
				{
					name: 'return',
					valueString: 'c',
				},
			],
		})
	).toStrictEqual(['a', 'b', 'c']);
});

test('nested list of integers response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'return',
					part: [
						{
							name: 'element',
							valueInteger: 1,
						},
						{
							name: 'element',
							valueInteger: 2,
						},
						{
							name: 'element',
							valueInteger: 3,
						},
					],
				},
				{
					name: 'return',
					part: [
						{
							name: 'element',
							valueInteger: 4,
						},
						{
							name: 'element',
							valueInteger: 5,
						},
						{
							name: 'element',
							valueInteger: 6,
						},
					],
				},
			],
		})
	).toStrictEqual([
		[1, 2, 3],
		[4, 5, 6],
	]);
});

// Numeric intervals mapped to Range with unity-coded boundaries (FHIR-56226)

test('decimal interval response check (precision extension on the quantity)', () => {
	const result = extractRange(
		{
			low: {
				value: 1.0,
				system: UCUM_SYSTEM,
				code: '1',
				extension: [{ url: PRECISION_URL, valueInteger: 1 }],
			},
			high: {
				value: 1.3,
				system: UCUM_SYSTEM,
				code: '1',
				extension: [{ url: PRECISION_URL, valueInteger: 1 }],
			},
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Decimal>' }]
	);
	expect(result).toStrictEqual({ lowClosed: true, low: 1.0, highClosed: true, high: 1.3 });
	expect(getIntervalMeta(result)).toStrictEqual({
		pointType: 'Decimal',
		lowPrecision: 1,
		highPrecision: 1,
	});
});

test('decimal interval response check (precision extension on Quantity.value)', () => {
	const result = extractRange(
		{
			low: {
				value: 1.0,
				system: UCUM_SYSTEM,
				code: '1',
				_value: { extension: [{ url: PRECISION_URL, valueInteger: 1 }] },
			},
			high: {
				value: 1.3,
				system: UCUM_SYSTEM,
				code: '1',
				_value: { extension: [{ url: PRECISION_URL, valueInteger: 1 }] },
			},
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Decimal>' }]
	);
	expect(result).toStrictEqual({ lowClosed: true, low: 1.0, highClosed: true, high: 1.3 });
	expect(getIntervalMeta(result)).toStrictEqual({
		pointType: 'Decimal',
		lowPrecision: 1,
		highPrecision: 1,
	});
});

test('integer interval response check (typed by the cqlType extension)', () => {
	const result = extractRange(
		{
			low: { value: 1, system: UCUM_SYSTEM, code: '1' },
			high: { value: 3, system: UCUM_SYSTEM, code: '1' },
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Integer>' }]
	);
	expect(result).toStrictEqual({ lowClosed: true, low: 1, highClosed: true, high: 3 });
	expect(getIntervalMeta(result)).toStrictEqual({ pointType: 'Integer' });
});

test('numeric interval response check with string-encoded boundary values', () => {
	const result = extractRange(
		{
			low: { value: '1.0', system: UCUM_SYSTEM, code: '1' },
			high: { value: '1.40', system: UCUM_SYSTEM, code: '1' },
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Decimal>' }]
	);
	expect(result).toStrictEqual({ lowClosed: true, low: 1.0, highClosed: true, high: 1.4 });
	expect(getIntervalMeta(result)).toStrictEqual({
		pointType: 'Decimal',
		lowPrecision: 1,
		highPrecision: 2,
	});
});

test('half-open numeric interval response check (no high boundary)', () => {
	const result = extractRange({ low: { value: 1, system: UCUM_SYSTEM, code: '1' } }, [
		{ url: CQL_TYPE_URL, valueString: 'Interval<System.Decimal>' },
	]);
	expect(result).toStrictEqual({ lowClosed: true, low: 1, highClosed: false, high: null });
	expect(getIntervalMeta(result)).toStrictEqual({ pointType: 'Decimal' });
});

test('quantity interval response check still yields quantity boundaries', () => {
	const result = extractRange({
		low: { value: 1, unit: 'ml', system: UCUM_SYSTEM, code: 'ml' },
		high: { value: 2, unit: 'ml', system: UCUM_SYSTEM, code: 'ml' },
	});
	expect(result).toStrictEqual({
		lowClosed: true,
		low: { value: 1, unit: 'ml' },
		highClosed: true,
		high: { value: 2, unit: 'ml' },
	});
	expect(getIntervalMeta(result)).toBeUndefined();
});

test('quantity interval declared by cqlType is not treated as numeric', () => {
	const result = extractRange(
		{
			low: { value: 1, system: UCUM_SYSTEM, code: '1' },
			high: { value: 2, system: UCUM_SYSTEM, code: '1' },
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Quantity>' }]
	);
	expect(result).toStrictEqual({
		lowClosed: true,
		low: { value: 1, unit: '1' },
		highClosed: true,
		high: { value: 2, unit: '1' },
	});
	expect(getIntervalMeta(result)).toBeUndefined();
});

test('unity-coded range without a cqlType extension stays a quantity interval', () => {
	// Strict detection: unity coding alone does not identify a numeric interval, so the
	// range falls through to QuantityIntervalExtractor.
	const result = extractRange({
		low: { value: 1, system: UCUM_SYSTEM, code: '1' },
		high: { value: 2, system: UCUM_SYSTEM, code: '1' },
	});
	expect(result).toStrictEqual({
		lowClosed: true,
		low: { value: 1, unit: '1' },
		highClosed: true,
		high: { value: 2, unit: '1' },
	});
	expect(getIntervalMeta(result)).toBeUndefined();
});

test('boundary without a usable numeric value is treated as absent', () => {
	// A present boundary quantity whose value is missing or not numeric must not produce
	// a closed boundary with an unusable value (PR #110 review).
	const result = extractRange(
		{
			low: { value: 'abc', code: '1', system: 'http://unitsofmeasure.org' },
			high: { value: 2, code: '1', system: 'http://unitsofmeasure.org' },
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Decimal>' }]
	);

	expect(result).toStrictEqual({ lowClosed: false, low: null, highClosed: true, high: 2 });

	expect(
		extractRange(
			{
				low: { value: 1, code: '1', system: 'http://unitsofmeasure.org' },
				high: { value: true, code: '1', system: 'http://unitsofmeasure.org' },
			},
			[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Decimal>' }]
		)
	).toStrictEqual({ lowClosed: true, low: 1, highClosed: false, high: null });
});

test('long interval boundaries extract as BigInt', () => {
	// Number() would round above 2^53; string-encoded Long values must stay exact.
	const result = extractRange(
		{
			low: { value: '1', code: '1', system: 'http://unitsofmeasure.org' },
			high: { value: '9007199254740995', code: '1', system: 'http://unitsofmeasure.org' },
		},
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Long>' }]
	);

	expect(result).toStrictEqual({
		lowClosed: true,
		low: 1n,
		highClosed: true,
		high: 9007199254740995n,
	});
	expect(getIntervalMeta(result)).toStrictEqual({ pointType: 'Long' });

	// JSON-number values also become BigInt (exact only within the safe integer range);
	// a non-integral value is not a valid Long and is treated as an absent boundary.
	expect(
		extractRange(
			{
				low: { value: 3, code: '1', system: 'http://unitsofmeasure.org' },
				high: { value: 4.5, code: '1', system: 'http://unitsofmeasure.org' },
			},
			[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Long>' }]
		)
	).toStrictEqual({ lowClosed: true, low: 3n, highClosed: false, high: null });
});

// Intervals in the part-based representation (issue #85): the point type is derived from
// the wire so open boundaries can be normalized with the right step.

function extractIntervalParts(parts: any[], extension?: any[]): any {
	return extractor!.extract({
		resourceType: 'Parameters',
		parameter: [
			{
				name: 'return',
				...(extension === undefined ? {} : { extension: extension }),
				part: parts,
			},
		],
	});
}

test('part-form integer interval derives the Integer point type', () => {
	const result = extractIntervalParts([
		{ name: 'low', valueInteger: 1 },
		{ name: 'lowClosed', valueBoolean: true },
		{ name: 'high', valueInteger: 4 },
		{ name: 'highClosed', valueBoolean: false },
	]);

	expect(result).toStrictEqual({ low: 1, lowClosed: true, high: 4, highClosed: false });
	expect(getIntervalMeta(result)).toStrictEqual({ pointType: 'Integer' });
});

test('part-form decimal interval derives the Decimal point type', () => {
	const result = extractIntervalParts([
		{ name: 'low', valueDecimal: 1.0 },
		{ name: 'lowClosed', valueBoolean: true },
		{ name: 'high', valueDecimal: 4.0 },
		{ name: 'highClosed', valueBoolean: false },
	]);

	expect(result).toStrictEqual({ low: 1.0, lowClosed: true, high: 4.0, highClosed: false });
	expect(getIntervalMeta(result)).toStrictEqual({ pointType: 'Decimal' });
});

test('part-form interval takes the point type from the cqlType extension when declared', () => {
	// String boundaries derive nothing on their own (a Long and a trailing-zero decimal are
	// both valueString), so the declared type is what identifies this as a Long interval.
	const result = extractIntervalParts(
		[
			{ name: 'low', valueString: '1' },
			{ name: 'lowClosed', valueBoolean: true },
			{ name: 'high', valueString: '4' },
			{ name: 'highClosed', valueBoolean: false },
		],
		[{ url: CQL_TYPE_URL, valueString: 'Interval<System.Long>' }]
	);

	expect(result).toStrictEqual({ low: '1', lowClosed: true, high: '4', highClosed: false });
	expect(getIntervalMeta(result)).toStrictEqual({ pointType: 'Long' });
});

test('part-form interval with mixed boundary element types derives nothing', () => {
	const result = extractIntervalParts([
		{ name: 'low', valueInteger: 1 },
		{ name: 'lowClosed', valueBoolean: true },
		{ name: 'high', valueDecimal: 4.5 },
		{ name: 'highClosed', valueBoolean: false },
	]);

	expect(result).toStrictEqual({ low: 1, lowClosed: true, high: 4.5, highClosed: false });
	expect(getIntervalMeta(result)).toBeUndefined();
});

test('part-form interval with string boundaries and no cqlType derives nothing', () => {
	const result = extractIntervalParts([
		{ name: 'low', valueString: '1' },
		{ name: 'lowClosed', valueBoolean: true },
		{ name: 'high', valueString: '4' },
		{ name: 'highClosed', valueBoolean: false },
	]);

	expect(getIntervalMeta(result)).toBeUndefined();
});
