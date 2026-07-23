/**
 * Compares an expected CQL Long (parsed to a BigInt by cvl) against the actual value.
 * A Long result must be returned as valueString (FHIR R4 has no integer64 type) or
 * as valueInteger64 (serialized as a JSON string), so the actual is a string either way.
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
		if (!actualKeys.includes(key) || !resultsEqual(expected[key], actual[key])) {
			return false;
		}
	}

	return true;
}
