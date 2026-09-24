import { describe, it, expect, beforeAll } from 'vitest';
import { buildExtractor } from '../src/server/extractor-builder.js';

/**
 * The IG places the absence extensions on the *value element*. A null result has no value element
 * to hang them on, so an engine uses the companion of whatever type it would have sent —
 * `_valueBoolean` for a null Boolean, `_valueString` for a null String, and so on. The extractor
 * must therefore look at every companion, not just one.
 */
const DATA_ABSENT = {
	extension: [
		{ url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason', valueCode: 'unknown' },
	],
};
const EMPTY_LIST = {
	extension: [
		{ url: 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList', valueBoolean: true },
	],
};
const EMPTY_TUPLE = {
	extension: [
		{ url: 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyTuple', valueBoolean: true },
	],
};

let extractor: ReturnType<typeof buildExtractor>;

beforeAll(() => {
	extractor = buildExtractor();
});

function extract(parameter: any) {
	return extractor.extract({ resourceType: 'Parameters', parameter: [parameter] });
}

describe('absence markers on _valueBoolean', () => {
	// The shape the reference engine sends; these must keep working unchanged.
	it('reads a null result', () => {
		expect(extract({ name: 'return', _valueBoolean: DATA_ABSENT })).toBeNull();
	});

	it('reads an empty list', () => {
		expect(extract({ name: 'return', _valueBoolean: EMPTY_LIST })).toEqual([]);
	});

	it('reads an empty tuple', () => {
		expect(extract({ name: 'return', _valueBoolean: EMPTY_TUPLE })).toEqual({});
	});
});

describe('absence markers on any other companion element', () => {
	it.each(['_valueString', '_valueInteger', '_valueDecimal', '_valueDateTime', '_valueTime'])(
		'reads a null result declared on %s',
		companion => {
			expect(extract({ name: 'return', [companion]: DATA_ABSENT })).toBeNull();
		}
	);

	it('reads an empty list declared on a non-boolean companion', () => {
		expect(extract({ name: 'return', _valueInteger: EMPTY_LIST })).toEqual([]);
	});

	it('reads an empty tuple declared on a non-boolean companion', () => {
		expect(extract({ name: 'return', _valueString: EMPTY_TUPLE })).toEqual({});
	});

	it('reads a marker placed on the parameter itself', () => {
		expect(extract({ name: 'return', ...DATA_ABSENT })).toBeNull();
	});
});

describe('a parameter that carries a value is left alone', () => {
	it('prefers the value over a contradictory absence marker', () => {
		// data-absent-reason means the value is absent; if one was sent anyway it is the result.
		expect(extract({ name: 'return', valueBoolean: true, _valueBoolean: DATA_ABSENT })).toBe(
			true
		);
	});

	it('does not claim an ordinary value', () => {
		expect(extract({ name: 'return', valueString: 'hi' })).toBe('hi');
		expect(extract({ name: 'return', valueInteger: 0 })).toBe(0);
	});

	it('does not claim a structured value', () => {
		const result = extract({
			name: 'return',
			...EMPTY_TUPLE,
			part: [{ name: 'a', valueInteger: 1 }],
		});
		expect(result).not.toEqual({});
	});
});

describe('parameters with nothing to declare', () => {
	it('passes through a parameter with no extensions', () => {
		// No value and no marker: not this extractor's business.
		expect(extract({ name: 'return' })).toBeUndefined();
	});

	it('ignores an unrelated extension', () => {
		expect(
			extract({
				name: 'return',
				_valueString: { extension: [{ url: 'http://example.org/other', valueCode: 'unknown' }] },
			})
		).toBeUndefined();
	});

	it('ignores a marker whose value is false or missing', () => {
		expect(
			extract({
				name: 'return',
				_valueBoolean: {
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList',
							valueBoolean: false,
						},
					],
				},
			})
		).toBeUndefined();
	});

	it('ignores a data-absent-reason with a code other than unknown', () => {
		expect(
			extract({
				name: 'return',
				_valueBoolean: {
					extension: [
						{
							url: 'http://hl7.org/fhir/StructureDefinition/data-absent-reason',
							valueCode: 'masked',
						},
					],
				},
			})
		).toBeUndefined();
	});
});
