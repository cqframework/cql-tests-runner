import { getIntervalMeta, isIntervalShaped, type IntervalMeta } from './interval-utils.js';

/** Numeric tolerance for scalar comparison (interval boundaries use half their step). */
const EPSILON = 0.00000001;

/** CQL decimal successor/predecessor step (10^-8). */
const DECIMAL_STEP = 0.00000001;

/**
 * Compares an expected CQL Long (parsed to a BigInt by cvl) against the actual value.
 * FHIR R4 has no integer64 type, so a Long result is returned as valueString and the
 * extracted actual is a string.
 */
function longEquals(expected: bigint, actual: any): boolean {
	if (typeof actual === 'bigint') {
		return expected === actual;
	}
	if (typeof actual === 'string') {
		// BigInt('') is 0n and BigInt trims whitespace, so require an integer literal.
		if (!/^[+-]?\d+$/.test(actual)) {
			return false;
		}
		return BigInt(actual) === expected;
	}
	return false;
}

/**
 * Compares two results for equality, handling nested objects and numbers.
 *
 * Normalization handles representation differences that are not semantically
 * meaningful for CQL comparison:
 * - CVL can represent singleton Concept.codes as a single Code object while
 *   the extractor can preserve codes as Code[].
 * - Extracted runtime objects can include optional properties with undefined
 *   values, such as system/version/display. Those should not make an object
 *   unequal to the same object with those properties omitted.
 */
export function resultsEqual(expected: any, actual: any): boolean {
	return resultsEqualNormalized(
		normalizeForComparison(expected),
		normalizeForComparison(actual)
	);
}

function normalizeForComparison(value: any): any {
	if (Array.isArray(value)) {
		return value.map(normalizeForComparison);
	}

	if (value && typeof value === 'object') {
		const normalized: any = {};

		for (const [key, child] of Object.entries(value)) {
			// Ignore optional fields that are present only as undefined on runtime
			// objects. Object.keys includes these fields, causing false mismatches
			// against expected values where the fields are absent.
			if (child === undefined) {
				continue;
			}

			if (key === 'codes' && Array.isArray(child) && child.length === 1) {
				normalized[key] = normalizeForComparison(child[0]);
			} else {
				normalized[key] = normalizeForComparison(child);
			}
		}

		return normalized;
	}

	return value;
}

function resultsEqualNormalized(expected: any, actual: any): boolean {
	if (expected === undefined && actual === undefined) {
		return true;
	}

	if (expected === null && actual === null) {
		return true;
	}

	if (typeof expected === 'number') {
		return Math.abs(actual - expected) < EPSILON;
	}

	if (typeof expected === 'bigint') {
		return longEquals(expected, actual);
	}

	if (expected === actual) {
		return true;
	}

	if (
		typeof expected !== 'object' ||
		expected === null ||
		typeof actual !== 'object' ||
		actual === null
	) {
		return false;
	}

	if (isIntervalShaped(expected) && isIntervalShaped(actual)) {
		return intervalsEqual(expected, actual);
	}

	const expectedKeys = Object.keys(expected);
	const actualKeys = Object.keys(actual);

	if (expectedKeys.length !== actualKeys.length) return false;

	for (const key of expectedKeys) {
		if (!actualKeys.includes(key) || !resultsEqualNormalized(expected[key], actual[key])) {
			return false;
		}
	}

	return true;
}

/**
 * Compares two {lowClosed, low, highClosed, high} intervals, equating open and closed
 * forms of the same interval (FHIR-56226 / issue #85).
 *
 * FHIR `Range` cannot express open boundaries, so an engine reports `Interval[1.0, 1.4)`
 * as the closed `[1.0, 1.3]` plus a `quantity-precision` extension (precision 1). Expected
 * values parsed from the test suite may use either form. Both sides are therefore
 * normalized to closed boundaries by moving an open boundary one step inwards, and the
 * closed flags are consumed by that normalization rather than compared directly.
 *
 * Boundaries that are not numeric (date/time strings, non-numeric quantity values) fall
 * back to the pre-existing structural comparison: closed flags must match and the values
 * must be `resultsEqual`.
 */
export function intervalsEqual(expected: any, actual: any): boolean {
	const meta = getIntervalMeta(actual);

	return (
		boundariesEqual(
			expected.low,
			expected.lowClosed === true,
			actual.low,
			actual.lowClosed === true,
			'low',
			stepFor('low', meta)
		) &&
		boundariesEqual(
			expected.high,
			expected.highClosed === true,
			actual.high,
			actual.highClosed === true,
			'high',
			stepFor('high', meta)
		)
	);
}

/**
 * Distance between adjacent points of the interval's point type, used to convert an open
 * boundary to its closed equivalent.
 *
 * The integer step requires a point type recorded by an extractor — declared by the
 * `cqf-cqlType` extension on a Range, or derived from the FHIR element type of the
 * boundary parts in the part-based form. Inferring it from integral-looking boundary
 * values was implemented and then rejected in review: 1 and 1.0 are the same JS number,
 * so such a heuristic accepts both the integer-step and the decimal-step answer for the
 * same untyped expected interval.
 */
function stepFor(side: 'low' | 'high', meta: IntervalMeta | undefined): number {
	// Integer and Long points are one apart by definition; a precision extension cannot
	// change that (a valid precision of 0 would yield the same step anyway).
	if (meta?.pointType === 'Integer' || meta?.pointType === 'Long') {
		return 1;
	}

	// Only a non-negative integer is a meaningful decimal-place count; anything else is
	// ignored rather than producing a step greater than 1 or a fractional power of ten.
	const precision = side === 'low' ? meta?.lowPrecision : meta?.highPrecision;
	if (typeof precision === 'number' && Number.isInteger(precision) && precision >= 0) {
		return Math.pow(10, -precision);
	}

	// Decimal points (declared or assumed) are 10^-8 apart. Quantity boundaries land here
	// too: a CQL Quantity value is always a Decimal, so the predecessor of 2 'ml' is
	// 1.99999999 'ml', however integral the values look.
	return DECIMAL_STEP;
}

/**
 * The numeric value of a boundary: the boundary itself for numbers/BigInts, `.value` for
 * quantity boundaries, `null` for absent boundaries, `undefined` when not numeric at all.
 */
function numericValueOf(boundary: any): number | bigint | null | undefined {
	if (boundary === null || boundary === undefined) return null;
	if (typeof boundary === 'number' || typeof boundary === 'bigint') return boundary;

	if (isQuantityBoundary(boundary)) {
		const value = boundary.value;
		if (value === null || value === undefined) return null;
		if (typeof value === 'number' || typeof value === 'bigint') return value;
	}

	return undefined;
}

function isQuantityBoundary(boundary: any): boolean {
	return (
		boundary !== null &&
		typeof boundary === 'object' &&
		!Array.isArray(boundary) &&
		Object.prototype.hasOwnProperty.call(boundary, 'value')
	);
}

function boundariesEqual(
	expectedBoundary: any,
	expectedClosed: boolean,
	actualBoundary: any,
	actualClosed: boolean,
	side: 'low' | 'high',
	step: number
): boolean {
	const expectedValue = numericValueOf(expectedBoundary);
	const actualValue = numericValueOf(actualBoundary);

	if (expectedValue === null && actualValue === null) {
		// A missing boundary carries no value to normalize, so the flags matter directly.
		return expectedClosed === actualClosed;
	}
	if (expectedValue === null || actualValue === null) {
		return false;
	}

	// Non-numeric boundaries (date/time strings, coded values, ...) keep the pre-existing
	// structural comparison; predecessor/successor logic for those is out of scope.
	if (expectedValue === undefined || actualValue === undefined) {
		return expectedClosed === actualClosed && resultsEqual(expectedBoundary, actualBoundary);
	}

	const expectedIsQuantity = isQuantityBoundary(expectedBoundary);
	const actualIsQuantity = isQuantityBoundary(actualBoundary);
	if (expectedIsQuantity !== actualIsQuantity) return false;

	if (expectedIsQuantity) {
		if (!unitsEqual(expectedBoundary.unit, actualBoundary.unit)) return false;

		// Everything on the quantity other than the numeric value must match structurally.
		const expectedKeys = Object.keys(expectedBoundary);
		const actualKeys = Object.keys(actualBoundary);
		if (expectedKeys.length !== actualKeys.length) return false;
		for (const key of expectedKeys) {
			if (key === 'value' || key === 'unit') continue;
			if (
				!actualKeys.includes(key) ||
				!resultsEqual(expectedBoundary[key], actualBoundary[key])
			) {
				return false;
			}
		}
	}

	const normalizedExpected = closeBoundary(expectedValue, expectedClosed, side, step);
	const normalizedActual = closeBoundary(actualValue, actualClosed, side, step);

	// At extreme magnitudes the step underflows the float's resolution and closing an
	// open boundary changes nothing (1e9 - 1e-8 === 1e9). If exactly one side was open,
	// the intervals still differ by one point — the value just can't express it — so
	// they are different by rule, not equal by rounding.
	if (expectedClosed !== actualClosed) {
		const openMoved = expectedClosed
			? normalizedActual !== actualValue
			: normalizedExpected !== expectedValue;
		if (!openMoved) {
			return false;
		}
	}

	// The tolerance must sit well below the step, otherwise two values a full step apart
	// can compare equal purely through float rounding of the subtraction. Half a step is
	// also the semantic rule: values closer than that are the same point at the effective
	// precision, values a full step apart are adjacent points and therefore different.
	return scalarsEqual(normalizedExpected, normalizedActual, step / 2);
}

function unitsEqual(expectedUnit: any, actualUnit: any): boolean {
	const expected = expectedUnit === undefined ? null : expectedUnit;
	const actual = actualUnit === undefined ? null : actualUnit;
	return expected === actual;
}

/** Converts an open boundary to its closed equivalent by moving it one step inwards. */
function closeBoundary(
	value: number | bigint,
	closed: boolean,
	side: 'low' | 'high',
	step: number
): number | bigint {
	if (closed) return value;

	if (typeof value === 'bigint') {
		if (Number.isInteger(step)) {
			const bigStep = BigInt(step);
			return side === 'high' ? value - bigStep : value + bigStep;
		}
		const asNumber = Number(value);
		return side === 'high' ? asNumber - step : asNumber + step;
	}

	return side === 'high' ? value - step : value + step;
}

function scalarsEqual(
	expected: number | bigint,
	actual: number | bigint,
	tolerance: number
): boolean {
	if (typeof expected === 'bigint' && typeof actual === 'bigint') {
		if (isSafeBigInt(expected) && isSafeBigInt(actual)) {
			return Math.abs(Number(expected) - Number(actual)) < tolerance;
		}
		return expected === actual;
	}

	if (typeof expected === 'bigint' || typeof actual === 'bigint') {
		const big = (typeof expected === 'bigint' ? expected : actual) as bigint;
		const other = (typeof expected === 'bigint' ? actual : expected) as number;

		if (isSafeBigInt(big)) {
			return Math.abs(Number(big) - other) < tolerance;
		}

		// Outside the safe integer range only an exact integral comparison is meaningful.
		return Number.isInteger(other) && BigInt(other) === big;
	}

	return Math.abs(expected - actual) < tolerance;
}

function isSafeBigInt(value: bigint): boolean {
	return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(-Number.MAX_SAFE_INTEGER);
}
