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
		return Math.abs(actual - expected) < 0.00000001;
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
