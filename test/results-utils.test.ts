// Author: Preston Lee

import { expect, test } from 'vitest';

import { resultsEqual } from '../src/shared/results-utils.js';

test('singleton list does not equal scalar (comparison stays strict)', () => {
	expect(resultsEqual(['a'], 'a')).toBe(false);
	expect(resultsEqual('a', ['a'])).toBe(false);
});

test('equal lists (order-insensitive)', () => {
	expect(resultsEqual(['a', 'b'], ['a', 'b'])).toBe(true);
	expect(resultsEqual(['a', 'b'], ['b', 'a'])).toBe(false);
});

test('nested structures compared key-wise', () => {
	expect(resultsEqual({ x: 1 }, { x: 1 })).toBe(true);
});

test('expected Long matches FHIR R4 valueString encoding', () => {
	expect(resultsEqual(1n, '1')).toBe(true);
	expect(resultsEqual(-1n, '-1')).toBe(true);
	expect(resultsEqual(0n, '0')).toBe(true);
	expect(resultsEqual(9223372036854775807n, '9223372036854775807')).toBe(true);
	expect(resultsEqual(1n, '2')).toBe(false);
});

test('expected Long matches integer and bigint actuals', () => {
	expect(resultsEqual(1n, 1)).toBe(true);
	expect(resultsEqual(1n, 1n)).toBe(true);
	expect(resultsEqual(1n, 2)).toBe(false);
	expect(resultsEqual(1n, 1.5)).toBe(false);
});

test('expected Long rejects non-integer strings', () => {
	expect(resultsEqual(1n, 'abc')).toBe(false);
	expect(resultsEqual(1n, '1.5')).toBe(false);
	expect(resultsEqual(0n, '')).toBe(false);
	expect(resultsEqual(0n, ' 0 ')).toBe(false);
	expect(resultsEqual(1n, null)).toBe(false);
	expect(resultsEqual(1n, undefined)).toBe(false);
});

test('Long values compare inside lists and structures', () => {
	expect(resultsEqual([1n, 2n], ['1', '2'])).toBe(true);
	expect(resultsEqual({ x: 1n }, { x: '1' })).toBe(true);
	expect(resultsEqual([1n, 2n], ['1', '3'])).toBe(false);
});
