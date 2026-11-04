import { beforeAll, describe, expect, test } from 'vitest';

import { ResultExtractor } from '../src/extractors/result-extractor.js';
import { ValueMap } from '../src/extractors/value-map.js';
import { buildExtractor } from '../src/server/extractor-builder.js';
import { resultsEqual } from '../src/shared/results-utils.js';
import { parseCqlType } from '../src/shared/cql-type.js';

// Issue #150: honour a declared List cqf-cqlType when deciding whether a single result is a
// list. The responses below are cql-execution's wire format, captured from its test server.

const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';
const ABSENT = {
	extension: [
		{ url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason', valueCode: 'unknown' },
	],
};
const EMPTY_LIST = {
	extension: [
		{ url: 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList', valueBoolean: true },
	],
};

let extractor: ResultExtractor;
let cvl: any;

beforeAll(async () => {
	extractor = buildExtractor();
	// @ts-expect-error - cvl.mjs has no declaration file
	cvl = (await import('../cvl/cvl.mjs')).default;
});

function typed(type: string | undefined, rest: Record<string, any>): any {
	return {
		name: 'return',
		...(type === undefined ? {} : { extension: [{ url: CQL_TYPE_URL, valueString: type }] }),
		...rest,
	};
}

function response(...returns: any[]): any {
	return { resourceType: 'Parameters', parameter: returns };
}

/** Extracts as run-test-core does, with the expected-shape hint, and compares. */
function passes(expected: string, body: any): boolean {
	const parsed = cvl.parse(expected);
	const actual = extractor.extract(body, {
		singletonListKeys: ValueMap.singletonListKeysFromExpected(parsed),
	});
	return resultsEqual(parsed, actual);
}

describe('the false passes from issue #150', () => {
	test('a declared one-element list no longer matches a scalar expectation', () => {
		expect(passes("'a'", response(typed('List<System.String>', { valueString: 'a' })))).toBe(
			false
		);
	});

	test('a declared scalar no longer matches a one-element list expectation', () => {
		expect(passes("{'a'}", response(typed('System.String', { valueString: 'a' })))).toBe(false);
	});

	test('the matching declared shapes still pass', () => {
		expect(passes("{'a'}", response(typed('List<System.String>', { valueString: 'a' })))).toBe(
			true
		);
		expect(passes("'a'", response(typed('System.String', { valueString: 'a' })))).toBe(true);
	});

	test('an undeclared single value still gets the benefit of the doubt', () => {
		const body = response(typed(undefined, { valueString: 'a' }));
		expect(passes("{'a'}", body)).toBe(true);
		expect(passes("'a'", body)).toBe(true);
	});
});

describe('a lone return with no value is left to the hint', () => {
	const absent = response(typed('List<System.Any>', { _valueBoolean: ABSENT }));

	test('Tail(null) and {null} are the same on the wire, and both pass', () => {
		expect(passes('null', absent)).toBe(true);
		expect(passes('{null}', absent)).toBe(true);
	});

	test('an empty list stays empty', () => {
		const empty = response(typed('List<System.Integer>', { _valueBoolean: EMPTY_LIST }));
		expect(extractor.extract(empty)).toStrictEqual([]);
		expect(passes('{}', empty)).toBe(true);
	});

	test('several returns, one of them null, are still a list', () => {
		expect(
			extractor.extract(
				response(
					typed('List<System.Integer>', { valueInteger: 1 }),
					typed('List<System.Integer>', { _valueBoolean: ABSENT })
				)
			)
		).toStrictEqual([1, null]);
	});
});

describe('nested lists take their shape from the parent type', () => {
	test('{{"a"}} is a list holding a one-element list', () => {
		const body = response(
			typed('List<List<System.String>>', { part: [{ name: 'element', valueString: 'a' }] })
		);
		expect(extractor.extract(body)).toStrictEqual([['a']]);
		expect(passes("{{'a'}}", body)).toBe(true);
		expect(passes("{'a'}", body)).toBe(false);
	});

	test('{{"a"}, {"b"}} keeps each inner one-element list', () => {
		const body = response(
			typed('List<List<System.String>>', { part: [{ name: 'element', valueString: 'a' }] }),
			typed('List<List<System.String>>', { part: [{ name: 'element', valueString: 'b' }] })
		);
		expect(extractor.extract(body)).toStrictEqual([['a'], ['b']]);
		expect(passes("{'a', 'b'}", body)).toBe(false);
	});

	test('a tuple field declared List<T> stays a list with one element', () => {
		const body = response(
			typed(
				'Tuple<a System.Integer, b List<System.Integer>, c Tuple<d List<System.String>, e System.String>>',
				{
					part: [
						{ name: 'a', valueInteger: 1 },
						{ name: 'b', part: [{ name: 'element', valueInteger: 2 }] },
						{
							name: 'c',
							part: [
								{ name: 'd', part: [{ name: 'element', valueString: 'x' }] },
								{ name: 'e', valueString: 'y' },
							],
						},
					],
				}
			)
		);
		expect(extractor.extract(body)).toStrictEqual({ a: 1, b: [2], c: { d: ['x'], e: 'y' } });
		expect(passes("Tuple{a: 1, b: {2}, c: Tuple{d: {'x'}, e: 'y'}}", body)).toBe(true);
		expect(passes("Tuple{a: 1, b: 2, c: Tuple{d: 'x', e: 'y'}}", body)).toBe(false);
	});

	test('a list of tuples keeps each tuple a single value', () => {
		const body = response(
			typed('List<Tuple<x List<System.Integer>, y System.Integer>>', {
				part: [
					{ name: 'x', part: [{ name: 'element', valueInteger: 1 }] },
					{ name: 'y', valueInteger: 2 },
				],
			})
		);
		expect(extractor.extract(body)).toStrictEqual([{ x: [1], y: 2 }]);
	});
});

describe('parseCqlType', () => {
	test.each([
		['System.Integer', { name: 'System.Integer', args: [] }],
		[
			'List<Interval<System.Date>>',
			{
				name: 'List',
				args: [{ name: 'Interval', args: [{ name: 'System.Date', args: [] }] }],
			},
		],
		[
			'Choice<System.Integer, System.String>',
			{
				name: 'Choice',
				args: [
					{ name: 'System.Integer', args: [] },
					{ name: 'System.String', args: [] },
				],
			},
		],
	])('%s', (text, expected) => {
		expect(parseCqlType(text)).toStrictEqual(expected);
	});

	test('tuple fields', () => {
		const type = parseCqlType('Tuple<a System.Integer, b List<System.String>>');
		expect(type?.name).toBe('Tuple');
		expect(type?.fields?.get('a')).toStrictEqual({ name: 'System.Integer', args: [] });
		expect(type?.fields?.get('b')?.name).toBe('List');
	});

	test.each(['', 'List<', 'List<System.Integer', 'List<System.Integer>>', 'Tuple<a>', '<x>'])(
		'%j is unreadable',
		text => {
			expect(parseCqlType(text)).toBeUndefined();
		}
	);
});
