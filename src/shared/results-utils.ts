import { getIntervalMeta, isIntervalShaped, type IntervalMeta } from './interval-utils.js';

/** Numeric tolerance shared by scalar and interval-boundary comparison. */
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
 * Compares two results for equality, handling nested objects and numbers
 */
export function resultsEqual(expected: any, actual: any): boolean {
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
		if (!actualKeys.includes(key) || !resultsEqual(expected[key], actual[key])) {
			return false;
		}
	}

	return true;
}

const INTERVAL_KEYS = ['lowClosed', 'low', 'highClosed', 'high'];

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
	// Guard against interval-shaped objects that carry additional properties: anything
	// beyond the four interval keys is compared exactly as before.
	if (!extraKeysEqual(expected, actual)) return false;

	const meta = getIntervalMeta(actual);
	const integral = allBoundariesIntegral(expected, actual);

	return (
		boundariesEqual(
			expected.low,
			expected.lowClosed === true,
			actual.low,
			actual.lowClosed === true,
			'low',
			stepFor('low', meta, integral)
		) &&
		boundariesEqual(
			expected.high,
			expected.highClosed === true,
			actual.high,
			actual.highClosed === true,
			'high',
			stepFor('high', meta, integral)
		)
	);
}

function extraKeysEqual(expected: any, actual: any): boolean {
	const expectedKeys = Object.keys(expected);
	const actualKeys = Object.keys(actual);

	if (expectedKeys.length !== actualKeys.length) return false;

	for (const key of expectedKeys) {
		if (INTERVAL_KEYS.includes(key)) continue;
		if (!actualKeys.includes(key) || !resultsEqual(expected[key], actual[key])) {
			return false;
		}
	}

	// The four interval keys must be present on both sides (isIntervalShaped only
	// guarantees the two closed flags).
	for (const key of INTERVAL_KEYS) {
		if (expectedKeys.includes(key) !== actualKeys.includes(key)) return false;
	}

	return true;
}

/**
 * Distance between adjacent points of the interval's point type, used to convert an open
 * boundary to its closed equivalent.
 */
function stepFor(
	side: 'low' | 'high',
	meta: IntervalMeta | undefined,
	allIntegral: boolean
): number {
	const precision = side === 'low' ? meta?.lowPrecision : meta?.highPrecision;
	if (typeof precision === 'number' && Number.isFinite(precision)) {
		return Math.pow(10, -precision);
	}

	if (meta?.pointType === 'Integer' || meta?.pointType === 'Long') {
		return 1;
	}

	// An explicitly declared Decimal point type overrides the integrality heuristic below:
	// 1.0 and 1 are the same JS number, so only the declaration can tell them apart.
	if (meta?.pointType === 'Decimal') {
		return DECIMAL_STEP;
	}

	if (allIntegral) {
		return 1;
	}

	return DECIMAL_STEP;
}

/**
 * True when every non-null numeric boundary on both sides is an integer (or a BigInt).
 * Heuristic for integer/long intervals whose expected values carry no type information.
 * Quantity boundaries never qualify: a CQL Quantity value is always a Decimal, so the
 * predecessor of 2 'ml' is 1.99999999 'ml', however integral the values look.
 */
function allBoundariesIntegral(expected: any, actual: any): boolean {
	let sawValue = false;

	for (const interval of [expected, actual]) {
		for (const side of ['low', 'high']) {
			const boundary = interval[side];
			if (isQuantityBoundary(boundary)) return false;
			const value = numericValueOf(boundary);
			if (value === null || value === undefined) continue;
			sawValue = true;
			if (typeof value === 'number' && !Number.isInteger(value)) return false;
		}
	}

	return sawValue;
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

	return scalarsEqual(
		closeBoundary(expectedValue, expectedClosed, side, step),
		closeBoundary(actualValue, actualClosed, side, step)
	);
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

function scalarsEqual(expected: number | bigint, actual: number | bigint): boolean {
	if (typeof expected === 'bigint' && typeof actual === 'bigint') {
		if (isSafeBigInt(expected) && isSafeBigInt(actual)) {
			return Math.abs(Number(expected) - Number(actual)) < EPSILON;
		}
		return expected === actual;
	}

	if (typeof expected === 'bigint' || typeof actual === 'bigint') {
		const big = (typeof expected === 'bigint' ? expected : actual) as bigint;
		const other = (typeof expected === 'bigint' ? actual : expected) as number;

		if (isSafeBigInt(big)) {
			return Math.abs(Number(big) - other) < EPSILON;
		}

		// Outside the safe integer range only an exact integral comparison is meaningful.
		return Number.isInteger(other) && BigInt(other) === big;
	}

	return Math.abs(expected - actual) < EPSILON;
}

function isSafeBigInt(value: bigint): boolean {
	return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(-Number.MAX_SAFE_INTEGER);
}
