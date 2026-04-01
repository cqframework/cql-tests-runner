// Author: Preston Lee

import { expect, test } from 'vitest';

import { ValueMap } from '../src/extractors/value-map.js';

test('singleton collapse unwraps without hint', () => {
	const m = new ValueMap();
	m.add('return', 'a');
	expect(m.toResult()).toBe('a');
});

test('singleton collapse keeps array with hint (issue #82)', () => {
	const m = new ValueMap(new Set(['return']));
	m.add('return', 'a');
	expect(m.toResult()).toEqual(['a']);
});

test('multiple values stay array without special case', () => {
	const m = new ValueMap();
	m.add('return', 'a');
	m.add('return', 'b');
	expect(m.toResult()).toEqual(['a', 'b']);
});

test('singletonListKeysFromExpected: non-array yields empty key set', () => {
	expect([...ValueMap.singletonListKeysFromExpected('a')]).toEqual([]);
	expect([...ValueMap.singletonListKeysFromExpected({ a: 1 })]).toEqual([]);
});

test('singletonListKeysFromExpected: array adds return', () => {
	expect([...ValueMap.singletonListKeysFromExpected(['a'])]).toEqual(['return']);
	expect([...ValueMap.singletonListKeysFromExpected([1, 2])]).toEqual(['return']);
});

test('singletonListKeysFromExpected: array of arrays adds return and element', () => {
	const keys = ValueMap.singletonListKeysFromExpected([[1, 2]]);
	expect(keys.has('return')).toBe(true);
	expect(keys.has('element')).toBe(true);
});
