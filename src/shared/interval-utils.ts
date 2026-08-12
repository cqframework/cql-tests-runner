/**
 * Shared helpers for numeric interval handling (FHIR-56226).
 *
 * Numeric intervals (Interval<Integer|Long|Decimal>) are mapped to FHIR Range with
 * unity-coded Quantity boundaries carrying a quantity-precision extension. The
 * extractor records that precision (and the CQL point type) as metadata on the
 * extracted interval object so the comparison can equate open and closed boundary
 * forms. The metadata lives under a Symbol key and is non-enumerable, so it is
 * invisible to Object.keys-based structural comparison and JSON serialization.
 *
 * That invisibility cuts both ways: the metadata exists only on the live extracted
 * object. Any serialization boundary — JSON.stringify/parse round-trips,
 * structuredClone, persisting the actual to the results file and reading it back —
 * silently drops it, downgrading the interval to "untyped" (decimal-step) comparison.
 * Nothing enforces the ordering, so comparison MUST run on the object the extractor
 * returned, before any serialization. Keep this in mind when refactoring the
 * extraction→comparison call sites (e.g. the shared runner core proposed in #108).
 */

export const INTERVAL_META = Symbol.for('cql-tests-runner.intervalMeta');

export type IntervalPointType = 'Integer' | 'Long' | 'Decimal';

export interface IntervalMeta {
	pointType?: IntervalPointType;
	/** Decimal places declared via the quantity-precision extension on the low boundary. */
	lowPrecision?: number;
	/** Decimal places declared via the quantity-precision extension on the high boundary. */
	highPrecision?: number;
}

export function setIntervalMeta(interval: object, meta: IntervalMeta): void {
	Object.defineProperty(interval, INTERVAL_META, {
		value: meta,
		enumerable: false,
		writable: true,
		configurable: true,
	});
}

export function getIntervalMeta(interval: any): IntervalMeta | undefined {
	if (interval === null || typeof interval !== 'object') {
		return undefined;
	}
	return (interval as any)[INTERVAL_META];
}

const NUMERIC_INTERVAL_TYPE = /^Interval<(?:System\.)?(Integer|Long|Decimal)>$/;

/**
 * The CQL point type named by a numeric interval type string
 * (`Interval<Integer|Long|Decimal>`, `System.` prefix optional), or `undefined` for any
 * other type string.
 */
export function numericIntervalPointTypeOf(typeString: string): IntervalPointType | undefined {
	const match = NUMERIC_INTERVAL_TYPE.exec(typeString);
	return match === null ? undefined : (match[1] as IntervalPointType);
}

const INTERVAL_KEYS = ['lowClosed', 'low', 'highClosed', 'high'];

/**
 * True when a value has exactly the {lowClosed, low, highClosed, high} interval shape
 * produced by both the CVL parser and the interval extractors, with boolean closed
 * flags. The check is deliberately strict so that tuples which merely share some of
 * the field names keep comparing (and rendering) by plain value: a genuine four-key
 * tuple with boolean flags remains indistinguishable from an interval, but that
 * ambiguity is inherent — the CVL parser produces identical shapes for both.
 */
export function isIntervalShaped(value: any): boolean {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.keys(value).length === INTERVAL_KEYS.length &&
		INTERVAL_KEYS.every(key => Object.prototype.hasOwnProperty.call(value, key)) &&
		typeof value.lowClosed === 'boolean' &&
		typeof value.highClosed === 'boolean'
	);
}
