/**
 * Shared helpers for numeric interval handling (FHIR-56226).
 *
 * Numeric intervals (Interval<Integer|Long|Decimal>) are mapped to FHIR Range with
 * unity-coded Quantity boundaries carrying a quantity-precision extension. The
 * extractor records that precision (and the CQL point type) as metadata on the
 * extracted interval object so the comparison can equate open and closed boundary
 * forms. The metadata lives under a Symbol key and is non-enumerable, so it is
 * invisible to Object.keys-based structural comparison and JSON serialization.
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

/**
 * True when a value has the {lowClosed, low, highClosed, high} interval shape
 * produced by both the CVL parser and the interval extractors.
 */
export function isIntervalShaped(value: any): boolean {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.prototype.hasOwnProperty.call(value, 'lowClosed') &&
		Object.prototype.hasOwnProperty.call(value, 'highClosed')
	);
}
