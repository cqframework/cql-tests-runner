import { describe, it, expect } from 'vitest';
import { expectsError, preventsTranslation } from '../src/shared/invalid-utils.js';
import { Result } from '../src/shared/results-shared.js';

/**
 * testSchema.xsd defines five InvalidType values. Four of them say the test expects the engine to
 * fail; only `false` expects success.
 */
const ERROR_KINDS = ['true', 'semantic', 'syntax', 'execution'] as const;

describe('expectsError', () => {
	it('is true for every error kind the schema defines', () => {
		for (const kind of ERROR_KINDS) {
			expect(expectsError(kind), kind).toBe(true);
		}
	});

	it('is false for a test expected to succeed, or with no invalid attribute', () => {
		expect(expectsError('false')).toBe(false);
		expect(expectsError(undefined)).toBe(false);
		// The runner's own marker for a test that declares no expression at all.
		expect(expectsError('undefined')).toBe(false);
	});

	it('is false for an unrecognised value rather than treating it as an error', () => {
		expect(expectsError('nonsense')).toBe(false);
		expect(expectsError('')).toBe(false);
	});
});

describe('preventsTranslation', () => {
	it('is true only for errors the translator raises', () => {
		// A define that cannot translate would fail the whole generated library.
		expect(preventsTranslation('syntax')).toBe(true);
		expect(preventsTranslation('semantic')).toBe(true);
	});

	it('is false for run-time and execution errors, which translate fine', () => {
		expect(preventsTranslation('true')).toBe(false);
		expect(preventsTranslation('execution')).toBe(false);
	});

	it('is false for a valid expression or a missing attribute', () => {
		expect(preventsTranslation('false')).toBe(false);
		expect(preventsTranslation(undefined)).toBe(false);
	});
});

describe('Result treats every error kind as needing no output', () => {
	// A test that expects an error carries no <output>; before, only `true` and `semantic`
	// were recognised, so a syntax-invalid test with no output was skipped as
	// "No output specified" instead of being run.
	for (const kind of ERROR_KINDS) {
		it(`does not skip an invalid="${kind}" test that declares no output`, () => {
			const result = new Result('T', 'G', {
				name: 'ErrorExpected',
				expression: { text: 'Ceiling(2147483648)', invalid: kind as any },
			} as any);
			expect(result.testStatus).not.toBe('skip');
			expect(result.skipMessage).toBeUndefined();
		});
	}

	it('still skips a valid test that declares no output', () => {
		const result = new Result('T', 'G', {
			name: 'NoOutput',
			expression: '1 + 1',
		} as any);
		expect(result.testStatus).toBe('skip');
		expect(result.skipMessage).toBe('No output specified');
	});
});
