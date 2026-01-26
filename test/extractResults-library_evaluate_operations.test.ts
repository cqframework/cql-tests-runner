import { beforeAll, expect, test } from 'vitest';

import { ResultExtractor } from '../src/extractors/result-extractor.js';
import { buildExtractor } from '../src/server/extractor-builder.js';

let extractor: ResultExtractor | null = null;

beforeAll(() => {
	extractor = buildExtractor();
});

test('value types response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'get_bool',
					valueBoolean: true,
				},
				{
					name: 'get_date',
					valueDate: '2025-01-01',
				},
				{
					name: 'get_datetime',
					valueDateTime: '2025-01-01T12:34:56.789-04:00',
				},
				{
					name: 'get_decimal',
					valueDecimal: 1.23,
				},
				{
					name: 'get_integer',
					valueInteger: 1,
				},
				{
					name: 'get_string',
					valueString: 'abc',
				},
				{
					name: 'get_time',
					valueTime: '12:34:56.789',
				},
				{
					name: 'get_period',
					valuePeriod: {
						start: '2025-01-01T00:00:00-05:00',
						end: '2025-12-31T00:00:00-05:00',
					},
				},
				{
					name: 'get_quantity',
					valueQuantity: {
						value: 123,
						unit: 'kg',
						system: 'http://unitsofmeasure.org',
						code: 'kg',
					},
				},
				{
					name: 'get_code',
					valueCoding: {
						system: 'http://loinc.org',
						version: '1.0',
						code: '8480-6',
						display: 'Systolic blood pressure',
					},
				},
				{
					name: 'get_concept',
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
		get_bool: true,
		get_date: '@2025-01-01',
		get_datetime: '@2025-01-01T12:34:56.789-04:00',
		get_decimal: 1.23,
		get_integer: 1,
		get_string: 'abc',
		get_time: '@T12:34:56.789',
		get_period: {
			low: '@2025-01-01T00:00:00-05:00',
			lowClosed: true,
			high: '@2025-12-31T00:00:00-05:00',
			highClosed: true,
		},
		get_quantity: { value: 123, unit: 'kg' },
		get_code: {
			code: '8480-6',
			display: 'Systolic blood pressure',
			system: 'http://loinc.org',
			version: '1.0',
		},
		get_concept: {
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
		},
	});
});

test('lists response check', () => {
	expect(
		extractor!.extract({
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'get_list_of_booleans',
					valueBoolean: true,
				},
				{
					name: 'get_list_of_booleans',
					valueBoolean: false,
				},
				{
					name: 'get_list_of_booleans',
					valueBoolean: true,
				},
				{
					name: 'get_list_of_codes',
					valueCoding: {
						system: 'http://loinc.org',
						version: '1.0',
						code: '8480-6',
						display: 'Systolic blood pressure',
					},
				},
				{
					name: 'get_list_of_codes',
					valueCoding: {
						system: 'http://loinc.org',
						version: '1.0',
						code: '8462-4',
						display: 'Diastolic blood pressure',
					},
				},
				{
					name: 'get_list_of_decimals',
					valueDecimal: 1.1,
				},
				{
					name: 'get_list_of_decimals',
					valueDecimal: 2.2,
				},
				{
					name: 'get_list_of_decimals',
					valueDecimal: 3.3,
				},
				{
					name: 'get_list_of_integer',
					valueInteger: 1,
				},
				{
					name: 'get_list_of_integer',
					valueInteger: 2,
				},
				{
					name: 'get_list_of_integer',
					valueInteger: 3,
				},
				{
					name: 'get_list_of_mixed_values',
					valueInteger: 1,
				},
				{
					name: 'get_list_of_mixed_values',
					valueDecimal: 2.2,
				},
				{
					name: 'get_list_of_mixed_values',
					valueString: 'a',
				},
				{
					name: 'get_list_of_string',
					valueString: 'a',
				},
				{
					name: 'get_list_of_string',
					valueString: 'b',
				},
				{
					name: 'get_list_of_string',
					valueString: 'c',
				},
				{
					name: 'get_list_of_datetime',
					valueDateTime: '2025-05-05T05:05:05-05:00',
				},
				{
					name: 'get_list_of_datetime',
					valueDateTime: '2026-06-06T06:06:06-06:00',
				},
				{
					name: 'get_list_of_datetime',
					valueDateTime: '2027-07-07T07:07:07-07:00',
				},
				{
					name: 'get_list_of_date',
					valueDateTime: '2025-05-05',
				},
				{
					name: 'get_list_of_date',
					valueDateTime: '2026-06-06',
				},
				{
					name: 'get_list_of_date',
					valueDateTime: '2027-07-07',
				},
				{
					name: 'get_list_of_time',
					valueTime: '05:05:05-05:00',
				},
				{
					name: 'get_list_of_time',
					valueTime: '06:06:06-06:00',
				},
				{
					name: 'get_list_of_time',
					valueTime: '07:07:07-07:00',
				},
				{
					name: 'get_list_of_period',
					valuePeriod: {
						start: '2025-01-01T00:00:00-05:00',
						end: '2025-12-31T00:00:00-05:00',
					},
				},
				{
					name: 'get_list_of_period',
					valuePeriod: {
						start: '2026-01-01T00:00:00-05:00',
						end: '2026-12-31T00:00:00-05:00',
					},
				},
				{
					name: 'get_list_of_period',
					valuePeriod: {
						start: '2027-01-01T00:00:00-05:00',
						end: '2027-12-31T00:00:00-05:00',
					},
				},
			],
		})
	).toStrictEqual({
		get_list_of_booleans: [true, false, true],
		get_list_of_codes: [
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
		get_list_of_decimals: [1.1, 2.2, 3.3],
		get_list_of_integer: [1, 2, 3],
		get_list_of_mixed_values: [1, 2.2, 'a'],
		get_list_of_string: ['a', 'b', 'c'],
		get_list_of_datetime: [
			'@2025-05-05T05:05:05-05:00',
			'@2026-06-06T06:06:06-06:00',
			'@2027-07-07T07:07:07-07:00',
		],
		get_list_of_date: ['@2025-05-05T', '@2026-06-06T', '@2027-07-07T'],
		get_list_of_time: ['@T05:05:05-05:00', '@T06:06:06-06:00', '@T07:07:07-07:00'],
		get_list_of_period: [
			{
				low: '@2025-01-01T00:00:00-05:00',
				lowClosed: true,
				high: '@2025-12-31T00:00:00-05:00',
				highClosed: true,
			},
			{
				low: '@2026-01-01T00:00:00-05:00',
				lowClosed: true,
				high: '@2026-12-31T00:00:00-05:00',
				highClosed: true,
			},
			{
				low: '@2027-01-01T00:00:00-05:00',
				lowClosed: true,
				high: '@2027-12-31T00:00:00-05:00',
				highClosed: true,
			},
		],
	});
});
