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

describe('Result group capability merging', () => {
	// A <capability> on the enclosing <group> applies to every test in it. 996 of the
	// 1,016 groups in the suite declare one, and 1,670 tests declare none of their own —
	// those tests reported no capabilities at all before the group's was carried through.
	test('inherits the group capability when the test declares none', () => {
		const result = new Result(
			'CqlAggregateFunctionsTest',
			'Count',
			asTest({ name: 'CountNull', expression: 'Count({})', output: '0' }),
			{ code: 'aggregate-functions', value: 'true' }
		);

		expect(result.capability).toStrictEqual([{ code: 'aggregate-functions', value: 'true' }]);
	});

	test('merges group and test capabilities, without duplicating a shared code', () => {
		const result = new Result(
			'CqlAggregateFunctionsTest',
			'Product',
			asTest({
				name: 'ProductLong',
				expression: 'Product({ 1L, 2L })',
				output: '2L',
				capability: [
					{ code: 'aggregate-functions', value: 'true' },
					{ code: 'system.long', value: 'true' },
				],
			}),
			{ code: 'aggregate-functions', value: 'true' }
		);

		expect(result.capability).toStrictEqual([
			{ code: 'aggregate-functions', value: 'true' },
			{ code: 'system.long', value: 'true' },
		]);
	});

	test("a test's own entry wins over the group's for the same code", () => {
		const result = new Result(
			'T',
			'G',
			asTest({
				name: 'Override',
				expression: '1',
				output: '1',
				capability: { code: 'interval-operators', value: 'false' },
			}),
			{ code: 'interval-operators', value: 'true' }
		);

		expect(result.capability).toStrictEqual([{ code: 'interval-operators', value: 'false' }]);
	});

	test('a single group <capability> is normalized like a test one', () => {
		const asArray = new Result('T', 'G', asTest({ name: 'A', expression: '1', output: '1' }), [
			{ code: 'list-operators', value: 'true' },
		]);
		const asObject = new Result('T', 'G', asTest({ name: 'A', expression: '1', output: '1' }), {
			code: 'list-operators',
			value: 'true',
		});

		expect(asObject.capability).toStrictEqual(asArray.capability);
	});

	test('no group capability leaves the test capability untouched', () => {
		const result = new Result(
			'T',
			'G',
			asTest({
				name: 'A',
				expression: '1',
				output: '1',
				capability: { code: 'arithmetic', value: 'true' },
			})
		);

		expect(result.capability).toStrictEqual([{ code: 'arithmetic', value: 'true' }]);
	});
});
