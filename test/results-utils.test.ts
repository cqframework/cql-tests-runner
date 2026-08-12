// Author: Preston Lee

import { expect, test } from 'vitest';

import { setIntervalMeta, type IntervalMeta } from '../src/shared/interval-utils.js';
import { resultsEqual } from '../src/shared/results-utils.js';

/** Builds an "actual" interval carrying extractor metadata, as the extractors produce it. */
function actualInterval(interval: Record<string, any>, meta?: IntervalMeta): any {
	if (meta) {
		setIntervalMeta(interval, meta);
	}
	return interval;
}

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

// FHIR-56226 / issue #85: numeric intervals arrive as FHIR Range, which is always
// closed-boundary; open boundaries are converted at a declared precision.

test('FHIR-56226 ticket example: open expected high equals closed actual at declared precision', () => {
	const expected = { lowClosed: true, low: 1.0, highClosed: false, high: 1.4 };
	const actual = actualInterval(
		{ lowClosed: true, low: 1.0, highClosed: true, high: 1.3 },
		{ pointType: 'Decimal', lowPrecision: 1, highPrecision: 1 }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('declared precision on an already-closed boundary changes nothing', () => {
	const expected = { lowClosed: true, low: 1.0, highClosed: true, high: 1.3 };
	const actual = actualInterval(
		{ lowClosed: true, low: 1.0, highClosed: true, high: 1.3 },
		{ pointType: 'Decimal', lowPrecision: 1, highPrecision: 1 }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('issue #85: full-precision closed expected equals open actual part-form (decimal step)', () => {
	const expected = { lowClosed: true, low: 1.0, highClosed: true, high: 3.99999999 };
	const actual = { lowClosed: true, low: 1, highClosed: false, high: 4 };

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('issue #85: closed expected equals closed actual of the same decimal predecessor', () => {
	const expected = { lowClosed: true, low: 1.0, highClosed: true, high: 3.99999999 };
	const actual = { lowClosed: true, low: 1.0, highClosed: true, high: 3.99999999 };

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('integer interval: open expected [1, 4) equals closed actual [1, 3]', () => {
	const expected = { lowClosed: true, low: 1, highClosed: false, high: 4 };

	// No metadata: an untyped interval uses the decimal step, however integral its
	// boundaries look, so [1, 4) is not [1, 3].
	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: true, high: 3 })).toBe(
		false
	);

	// With a declared Integer point type the step is explicit.
	expect(
		resultsEqual(
			expected,
			actualInterval(
				{ lowClosed: true, low: 1, highClosed: true, high: 3 },
				{ pointType: 'Integer' }
			)
		)
	).toBe(true);
});

test('part-form open actual needs a recorded point type to step by one', () => {
	// The rule after the PR #110 review: an open part-form actual [1, 4) equals the closed
	// expected [1, 3] only when the extractor recorded a point type for it — derived from
	// the FHIR element type of the boundary parts (valueInteger) for the part-based form.
	const expected = { lowClosed: true, low: 1, highClosed: true, high: 3 };

	expect(
		resultsEqual(
			expected,
			actualInterval(
				{ lowClosed: true, low: 1, highClosed: false, high: 4 },
				{ pointType: 'Integer' }
			)
		)
	).toBe(true);
	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: false, high: 4 })).toBe(
		false
	);
});

test('integer interval: open low boundary is closed by adding the step', () => {
	const expected = { lowClosed: false, low: 0, highClosed: true, high: 3 };
	const actual = actualInterval(
		{ lowClosed: true, low: 1, highClosed: true, high: 3 },
		{ pointType: 'Integer' }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('long interval: BigInt expected boundaries compare against numeric actuals', () => {
	const expected = { lowClosed: true, low: 1n, highClosed: false, high: 4n };

	// Without a recorded point type the decimal step applies, BigInt boundaries included.
	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: true, high: 3 })).toBe(
		false
	);
	expect(
		resultsEqual(
			expected,
			actualInterval(
				{ lowClosed: true, low: 1, highClosed: true, high: 3 },
				{ pointType: 'Long' }
			)
		)
	).toBe(true);
	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: true, high: 4 })).toBe(
		false
	);
});

test('long interval: BigInt boundaries beyond the safe integer range compare exactly', () => {
	const expected = { lowClosed: true, low: 1n, highClosed: false, high: 9007199254740995n };
	const actual = actualInterval(
		{ lowClosed: true, low: 1n, highClosed: true, high: 9007199254740994n },
		{ pointType: 'Long' }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
	expect(
		resultsEqual(
			expected,
			actualInterval(
				{
					lowClosed: true,
					low: 1n,
					highClosed: true,
					high: 9007199254740995n,
				},
				{ pointType: 'Long' }
			)
		)
	).toBe(false);
});

test('both boundaries open with the same values are equal', () => {
	const expected = { lowClosed: true, low: 1, highClosed: false, high: 4 };
	const actual = { lowClosed: true, low: 1, highClosed: false, high: 4 };

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('undeclared precision truncation is still a mismatch', () => {
	const expected = { lowClosed: true, low: 1.0, highClosed: true, high: 3.99999999 };
	const actual = { lowClosed: true, low: 1.0, highClosed: true, high: 3.9 };

	expect(resultsEqual(expected, actual)).toBe(false);
});

test('decimal interval: open expected high does not equal a whole-number truncation', () => {
	// A Decimal point type steps by 10^-8: the predecessor of 4.0 is 3.99999999, not 3.0.
	const expected = { lowClosed: true, low: 1.0, highClosed: false, high: 4.0 };
	const actual = actualInterval(
		{ lowClosed: true, low: 1.0, highClosed: true, high: 3.0 },
		{ pointType: 'Decimal' }
	);

	expect(resultsEqual(expected, actual)).toBe(false);

	// Same conclusion without metadata: an untyped interval steps by 10^-8 too.
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1.5, highClosed: false, high: 4.0 },
			{ lowClosed: true, low: 1.5, highClosed: true, high: 3.0 }
		)
	).toBe(false);
});

test('null boundaries: equal only when the closed flags agree', () => {
	const expected = { lowClosed: true, low: 1, highClosed: false, high: null };

	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: false, high: null })).toBe(
		true
	);
	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: true, high: null })).toBe(
		false
	);
	expect(resultsEqual(expected, { lowClosed: true, low: 1, highClosed: true, high: 5 })).toBe(
		false
	);
	expect(resultsEqual({ lowClosed: true, low: 1, highClosed: true, high: 5 }, expected)).toBe(
		false
	);
});

test('quantity-boundary intervals keep comparing as before', () => {
	const expected = {
		lowClosed: true,
		low: { value: 1, unit: 'ml' },
		highClosed: true,
		high: { value: 2, unit: 'ml' },
	};

	expect(
		resultsEqual(expected, {
			lowClosed: true,
			low: { value: 1, unit: 'ml' },
			highClosed: true,
			high: { value: 2, unit: 'ml' },
		})
	).toBe(true);

	// Differing units are never equal, however the boundaries are normalized.
	expect(
		resultsEqual(expected, {
			lowClosed: true,
			low: { value: 1, unit: 'ml' },
			highClosed: true,
			high: { value: 2, unit: 'g' },
		})
	).toBe(false);
});

test('quantity-boundary interval: open expected high equals the closed predecessor', () => {
	const expected = {
		lowClosed: true,
		low: { value: 1, unit: 'ml' },
		highClosed: false,
		high: { value: 2, unit: 'ml' },
	};
	const actual = {
		lowClosed: true,
		low: { value: 1, unit: 'ml' },
		highClosed: true,
		high: { value: 1.99999999, unit: 'ml' },
	};

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('date/time intervals keep the structural comparison', () => {
	const expected = {
		lowClosed: true,
		low: '@2012-01-01',
		highClosed: true,
		high: '@2012-01-31',
	};

	expect(
		resultsEqual(expected, {
			lowClosed: true,
			low: '@2012-01-01',
			highClosed: true,
			high: '@2012-01-31',
		})
	).toBe(true);
	expect(
		resultsEqual(expected, {
			lowClosed: true,
			low: '@2012-01-01',
			highClosed: true,
			high: '@2012-02-01',
		})
	).toBe(false);
	expect(
		resultsEqual(expected, {
			lowClosed: true,
			low: '@2012-01-01',
			highClosed: false,
			high: '@2012-01-31',
		})
	).toBe(false);
});

test('lists of intervals compare element-wise', () => {
	const expected = [
		{ lowClosed: true, low: 1, highClosed: false, high: 4 },
		{ lowClosed: true, low: 1.0, highClosed: false, high: 1.4 },
	];
	const actual = [
		actualInterval(
			{ lowClosed: true, low: 1, highClosed: true, high: 3 },
			{ pointType: 'Integer' }
		),
		actualInterval(
			{ lowClosed: true, low: 1.0, highClosed: true, high: 1.3 },
			{ pointType: 'Decimal', lowPrecision: 1, highPrecision: 1 }
		),
	];

	expect(resultsEqual(expected, actual)).toBe(true);
	expect(resultsEqual(expected, [actual[0]])).toBe(false);
});

test('interval-shaped objects with extra properties still compare structurally', () => {
	// The boundaries are identical on both sides so the verdict turns on the extra keys
	// alone, whatever step the interval comparison picks.
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1, highClosed: false, high: 4, name: 'a' },
			{ lowClosed: true, low: 1, highClosed: false, high: 4, name: 'a' }
		)
	).toBe(true);
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1, highClosed: false, high: 4, name: 'a' },
			{ lowClosed: true, low: 1, highClosed: false, high: 4, name: 'b' }
		)
	).toBe(false);
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1, highClosed: false, high: 4 },
			{ lowClosed: true, low: 1, highClosed: false, high: 4, name: 'b' }
		)
	).toBe(false);
});

test('quantity boundaries always use the decimal step', () => {
	// Quantity values are CQL Decimals: the predecessor of 2 'ml' is 1.99999999 'ml',
	// so a whole-number truncation must not match the open expected boundary.
	const expected = {
		lowClosed: true,
		low: { value: 1, unit: 'ml' },
		highClosed: false,
		high: { value: 2, unit: 'ml' },
	};
	const actual = {
		lowClosed: true,
		low: { value: 1, unit: 'ml' },
		highClosed: true,
		high: { value: 1, unit: 'ml' },
	};

	expect(resultsEqual(expected, actual)).toBe(false);
});

test('expected Long matches FHIR R4 valueString encoding', () => {
	expect(resultsEqual(1n, '1')).toBe(true);
	expect(resultsEqual(-1n, '-1')).toBe(true);
	expect(resultsEqual(0n, '0')).toBe(true);
	expect(resultsEqual(9223372036854775807n, '9223372036854775807')).toBe(true);
	expect(resultsEqual(1n, '2')).toBe(false);
});

test('expected Long matches bigint actuals but not numbers (valueInteger is not allowed)', () => {
	expect(resultsEqual(1n, 1n)).toBe(true);
	expect(resultsEqual(1n, 2n)).toBe(false);
	expect(resultsEqual(1n, 1)).toBe(false);
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

test('integer/long point type always steps by one, whatever precision declares', () => {
	// A precision extension cannot change the distance between integer points (PR #110
	// review): step stays 1 even when a (bogus) precision is declared.
	const expected = { lowClosed: true, low: 1, highClosed: false, high: 4 };
	const actual = actualInterval(
		{ lowClosed: true, low: 1, highClosed: true, high: 3 },
		{ pointType: 'Integer', highPrecision: 2 }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('negative or fractional precision values are ignored', () => {
	// Only a non-negative integer is a meaningful decimal-place count; invalid values
	// fall back to the point-type default instead of producing a step > 1.
	const expected = { lowClosed: true, low: 1.0, highClosed: false, high: 4.0 };
	const actualHigh = 4.0 - 0.00000001;

	expect(
		resultsEqual(
			expected,
			actualInterval(
				{ lowClosed: true, low: 1.0, highClosed: true, high: actualHigh },
				{ pointType: 'Decimal', highPrecision: -1 }
			)
		)
	).toBe(true);

	expect(
		resultsEqual(
			expected,
			actualInterval(
				{ lowClosed: true, low: 1.0, highClosed: true, high: actualHigh },
				{ pointType: 'Decimal', highPrecision: 0.5 }
			)
		)
	).toBe(true);
});

test('boundary tolerance is half a step, not a full step', () => {
	// With tolerance == step, values a full step apart sit exactly on the comparison
	// boundary and the verdict depends on float rounding of the subtraction. Half a step
	// keeps "same point at the effective precision" and "adjacent points" apart.
	const closedAt = (high: number) => ({ lowClosed: true, low: 1.0, highClosed: true, high });

	// A full decimal step apart at large magnitude: deterministically unequal.
	expect(resultsEqual(closedAt(1000000.0), closedAt(999999.99999999))).toBe(false);

	// The same open/closed pair still normalizes to equality.
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1.0, highClosed: false, high: 1000000.0 },
			closedAt(999999.99999999)
		)
	).toBe(true);
});

test('long interval: extracted BigInt actuals compare exactly beyond 2^53', () => {
	const expected = { lowClosed: true, low: 1n, highClosed: false, high: 9007199254740996n };
	const actual = actualInterval(
		{ lowClosed: true, low: 1n, highClosed: true, high: 9007199254740995n },
		{ pointType: 'Long' }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
	expect(
		resultsEqual(
			expected,
			actualInterval(
				{ lowClosed: true, low: 1n, highClosed: true, high: 9007199254740994n },
				{ pointType: 'Long' }
			)
		)
	).toBe(false);
});

test('near-miss interval shapes compare as plain objects', () => {
	// Tuples that merely resemble intervals must keep main's value comparison: no
	// open/closed normalization, flags compared as ordinary values.
	const open = { lowClosed: true, low: 1, highClosed: false, high: 4 };

	// Non-boolean closed flag: not interval-shaped, so flag values must match exactly.
	expect(resultsEqual(open, { lowClosed: true, low: 1, highClosed: 'false', high: 4 })).toBe(
		false
	);
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1, highClosed: 'false', high: 4 },
			{ lowClosed: true, low: 1, highClosed: 'false', high: 4 }
		)
	).toBe(true);

	// Missing boundary key: not interval-shaped, generic key-count comparison applies.
	expect(resultsEqual(open, { lowClosed: true, low: 1, highClosed: false })).toBe(false);

	// Genuine four-key boolean-flag shape still gets interval semantics.
	expect(
		resultsEqual(
			open,
			actualInterval(
				{ lowClosed: true, low: 1, highClosed: true, high: 3 },
				{ pointType: 'Integer' }
			)
		)
	).toBe(true);
});

test('decimal precision 0 steps by one', () => {
	// Whole-number spacing is a legitimate declared precision for Decimals.
	const expected = { lowClosed: true, low: 1.0, highClosed: false, high: 4.0 };
	const actual = actualInterval(
		{ lowClosed: true, low: 1.0, highClosed: true, high: 3.0 },
		{ pointType: 'Decimal', lowPrecision: 0, highPrecision: 0 }
	);

	expect(resultsEqual(expected, actual)).toBe(true);
});

test('open vs closed at the same value is unequal at every magnitude', () => {
	// At extreme magnitudes the decimal step underflows the float's resolution
	// (1e9 - 1e-8 === 1e9), so normalization cannot move the open boundary; the flags
	// still say the intervals differ by one point, so they must not compare equal.
	for (const high of [4.0, 1000000.0, 10000000.0, 1000000000.0]) {
		expect(
			resultsEqual(
				{ lowClosed: true, low: 1.5, highClosed: false, high },
				{ lowClosed: true, low: 1.5, highClosed: true, high }
			)
		).toBe(false);
	}

	// Identical closed intervals at the same magnitude stay equal.
	expect(
		resultsEqual(
			{ lowClosed: true, low: 1.5, highClosed: true, high: 1000000000.0 },
			{ lowClosed: true, low: 1.5, highClosed: true, high: 1000000000.0 }
		)
	).toBe(true);
});
