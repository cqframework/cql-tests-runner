import { describe, expect, test } from 'vitest';

import { Result } from '../src/shared/results-shared.js';
import { Test } from '../src/models/test-types.js';

const asTest = (test: any): Test => test as Test;

describe('Result capability normalization', () => {
	// The XML parser gives a bare object for a single <capability> element and an array
	// only for two or more. Matching on Array.isArray alone silently dropped the
	// capability for every single-capability test, which is most of the suite.
	test('keeps the capability when a test declares exactly one', () => {
		const result = new Result(
			'CqlIntervalOperatorsTest',
			'Interval',
			asTest({
				name: 'TimeIntervalTest',
				expression: 'Interval[@T00:00:00.000, @T23:59:59.599]',
				output: 'Interval[@T00:00:00.000, @T23:59:59.599]',
				capability: { code: 'interval-operators', value: 'true' },
			})
		);

		expect(result.capability).toStrictEqual([{ code: 'interval-operators', value: 'true' }]);
	});

	test('keeps every capability when a test declares several', () => {
		const result = new Result(
			'CqlListOperatorsTest',
			'List',
			asTest({
				name: 'ListTest',
				expression: '{ 1, 2 }',
				output: '{ 1, 2 }',
				capability: [
					{ code: 'list-operators', value: 'true' },
					{ code: 'interval-operators', value: 'false' },
				],
			})
		);

		expect(result.capability).toStrictEqual([
			{ code: 'list-operators', value: 'true' },
			{ code: 'interval-operators', value: 'false' },
		]);
	});

	test('yields an empty list when a test declares none', () => {
		const result = new Result(
			'CqlTest',
			'Group',
			asTest({ name: 'NoCapability', expression: '1', output: '1' })
		);

		expect(result.capability).toStrictEqual([]);
	});

	test('normalization does not disturb the rest of the Result', () => {
		const result = new Result(
			'CqlTest',
			'Group',
			asTest({
				name: 'Simple',
				expression: '1 + 1',
				output: '2',
				capability: { code: 'arithmetic', value: 'true' },
			})
		);

		expect(result.testsName).toBe('CqlTest');
		expect(result.groupName).toBe('Group');
		expect(result.testName).toBe('Simple');
		expect(result.expression).toBe('1 + 1');
		expect(result.expected).toBe('2');
		expect(result.invalid).toBe('false');
	});
});
