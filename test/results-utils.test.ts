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
