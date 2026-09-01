import { describe, it, expect } from 'vitest';
import { resultsEqual } from '../src/shared/results-utils.js';

/**
 * ISO 8601 lets UTC be written either as `Z` or as `+00:00`. A test may declare one spelling while
 * an engine returns the other, and the two denote the same instant, so the comparison must not
 * fail on notation alone.
 */
describe('UTC designator equivalence', () => {
	it('equates Z with +00:00 in a DateTime literal, both ways round', () => {
		expect(
			resultsEqual('@2014-01-01T12:05:05.955+00:00', '@2014-01-01T12:05:05.955Z')
		).toBe(true);
		expect(
			resultsEqual('@2014-01-01T12:05:05.955Z', '@2014-01-01T12:05:05.955+00:00')
		).toBe(true);
	});

	it('equates them in a Time literal', () => {
		expect(resultsEqual('@T12:05:05.955Z', '@T12:05:05.955+00:00')).toBe(true);
	});

	it('still distinguishes different instants', () => {
		expect(
			resultsEqual('@2014-01-01T12:05:05.955+00:00', '@2014-01-01T12:05:05.999Z')
		).toBe(false);
	});

	it('does not treat a non-UTC offset as UTC', () => {
		expect(
			resultsEqual('@2014-01-01T12:05:05.955+05:00', '@2014-01-01T12:05:05.955Z')
		).toBe(false);
		// -00:00 is not the same token as +00:00; left unequal rather than guessed at.
		expect(
			resultsEqual('@2014-01-01T12:05:05.955-00:00', '@2014-01-01T12:05:05.955Z')
		).toBe(false);
	});

	it('leaves ordinary strings alone', () => {
		// A genuine String result of "Z" must never be rewritten into an offset.
		expect(resultsEqual('Z', '+00:00')).toBe(false);
		expect(resultsEqual('hello', 'world')).toBe(false);
		expect(resultsEqual('2014-01-01T12:05:05.955Z', '2014-01-01T12:05:05.955+00:00')).toBe(
			false
		);
	});

	it('equates them inside a list and inside an interval', () => {
		expect(
			resultsEqual(['@2014-01-01T00:00:00.000Z'], ['@2014-01-01T00:00:00.000+00:00'])
		).toBe(true);
		expect(
			resultsEqual(
				{ lowClosed: true, low: '@2014-01-01T00:00:00.000Z', highClosed: true, high: null },
				{
					lowClosed: true,
					low: '@2014-01-01T00:00:00.000+00:00',
					highClosed: true,
					high: null,
				}
			)
		).toBe(true);
	});
});
