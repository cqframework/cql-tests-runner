import { describe, it, expect } from 'vitest';
import { OnlySelection, SkipSelection } from '../src/conf/test-selection.js';
import { ConfigValidator } from '../src/conf/config-validator.js';

const test = (testsName: string, groupName: string, testName: string) => ({
	testsName,
	groupName,
	testName,
});

describe('SkipSelection', () => {
	it('skips a single test when all three names are given', () => {
		const skip = new SkipSelection([
			{ testsName: 'Suite1', groupName: 'Group1', testName: 'Test1', reason: 'one test' },
		]);
		expect(skip.reasonFor(test('Suite1', 'Group1', 'Test1'))).toBe('one test');
		expect(skip.reasonFor(test('Suite1', 'Group1', 'Test2'))).toBeUndefined();
	});

	it('skips every test in a suite when only testsName is given', () => {
		const skip = new SkipSelection([{ testsName: 'Suite1', reason: 'whole suite' }]);
		expect(skip.reasonFor(test('Suite1', 'Group1', 'Test1'))).toBe('whole suite');
		expect(skip.reasonFor(test('Suite1', 'Group2', 'Test9'))).toBe('whole suite');
		expect(skip.reasonFor(test('Suite2', 'Group1', 'Test1'))).toBeUndefined();
	});

	it('skips every test in a group when testsName and groupName are given', () => {
		const skip = new SkipSelection([
			{ testsName: 'Suite1', groupName: 'Group1', reason: 'whole group' },
		]);
		expect(skip.reasonFor(test('Suite1', 'Group1', 'Test1'))).toBe('whole group');
		expect(skip.reasonFor(test('Suite1', 'Group1', 'Test2'))).toBe('whole group');
		expect(skip.reasonFor(test('Suite1', 'Group2', 'Test1'))).toBeUndefined();
		expect(skip.reasonFor(test('Suite2', 'Group1', 'Test1'))).toBeUndefined();
	});

	it('reports the most specific matching entry, whatever the list order', () => {
		const entries = [
			{ testsName: 'Suite1', reason: 'suite' },
			{ testsName: 'Suite1', groupName: 'Group1', testName: 'Test1', reason: 'test' },
			{ testsName: 'Suite1', groupName: 'Group1', reason: 'group' },
		];
		for (const ordered of [entries, [...entries].reverse()]) {
			const skip = new SkipSelection(ordered);
			expect(skip.reasonFor(test('Suite1', 'Group1', 'Test1'))).toBe('test');
			expect(skip.reasonFor(test('Suite1', 'Group1', 'Test2'))).toBe('group');
			expect(skip.reasonFor(test('Suite1', 'Group2', 'Test1'))).toBe('suite');
		}
	});

	it('still skips when the reason is empty', () => {
		const skip = new SkipSelection([{ testsName: 'Suite1', reason: '' }]);
		expect(skip.reasonFor(test('Suite1', 'Group1', 'Test1'))).toBe('');
	});
});

describe('OnlySelection', () => {
	it('includes every test when empty', () => {
		const only = new OnlySelection([]);
		expect(only.isEmpty).toBe(true);
		expect(only.includes(test('Suite1', 'Group1', 'Test1'))).toBe(true);
	});

	it('selects at suite, group and test level', () => {
		const only = new OnlySelection([
			{ testsName: 'Suite1' },
			{ testsName: 'Suite2', groupName: 'Group1' },
			{ testsName: 'Suite3', groupName: 'Group1', testName: 'Test1' },
		]);
		expect(only.includes(test('Suite1', 'Any', 'Any'))).toBe(true);
		expect(only.includes(test('Suite2', 'Group1', 'Any'))).toBe(true);
		expect(only.includes(test('Suite2', 'Group2', 'Any'))).toBe(false);
		expect(only.includes(test('Suite3', 'Group1', 'Test1'))).toBe(true);
		expect(only.includes(test('Suite3', 'Group1', 'Test2'))).toBe(false);
		expect(only.includes(test('Suite4', 'Group1', 'Test1'))).toBe(false);
	});
});

describe('configuration schema for SkipList and OnlyList entries', () => {
	const config = (tests: object) => ({
		FhirServer: { BaseUrl: 'http://localhost:8080/fhir/', CqlOperation: '$cql' },
		Build: { CqlFileVersion: '1.0.000', CqlOutputPath: './cql' },
		Debug: { QuickTest: false },
		Tests: { ResultsPath: './results', SkipList: [], ...tests },
	});
	const validator = new ConfigValidator();

	it('accepts suite-level and group-level entries', () => {
		const result = validator.validateConfig(
			config({
				SkipList: [
					{ testsName: 'CqlAggregateFunctionsTest', reason: 'testing this' },
					{
						testsName: 'CqlAggregateFunctionsTest',
						groupName: 'Max',
						reason: 'testing this',
					},
				],
				OnlyList: [
					{ testsName: 'CqlTypesTest' },
					{ testsName: 'CqlTypesTest', groupName: 'Any' },
				],
			})
		);
		expect(result.errors).toEqual([]);
		expect(result.isValid).toBe(true);
	});

	it('still requires testsName, and a reason for skips', () => {
		expect(
			validator.validateConfig(
				config({ SkipList: [{ groupName: 'Max', reason: 'no suite' }] })
			).isValid
		).toBe(false);
		expect(
			validator.validateConfig(
				config({ SkipList: [{ testsName: 'CqlAggregateFunctionsTest' }] })
			).isValid
		).toBe(false);
		expect(validator.validateConfig(config({ OnlyList: [{ groupName: 'Max' }] })).isValid).toBe(
			false
		);
	});
});
