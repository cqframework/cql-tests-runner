import { beforeAll, expect, test } from 'vitest';

import { ResultExtractor } from '../src/extractors/result-extractor.js';
import { buildExtractor } from '../src/server/extractor-builder.js';

let extractor: ResultExtractor | null = null;

beforeAll(() => {
	extractor = buildExtractor();
});

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
