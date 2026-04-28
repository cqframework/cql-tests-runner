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

	if (expected === actual) {
		return true;
	}

	if (cqlDateTimesEqual(expected, actual)) {
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

interface CqlDateTimeParts {
	base: string;
	timezone?: string;
}

function cqlDateTimesEqual(expected: any, actual: any): boolean {
	if (typeof expected !== 'string' || typeof actual !== 'string') {
		return false;
	}

	const expectedDateTime = parseCqlDateTime(expected);
	const actualDateTime = parseCqlDateTime(actual);

	if (!expectedDateTime || !actualDateTime) {
		return false;
	}

	if (expectedDateTime.base !== actualDateTime.base) {
		return false;
	}

	// If either side omits timezone, compare only the local DateTime components.
	// Some engines return the server default timezone for DateTimes that were
	// authored without an explicit timezone, e.g. @2014-01-01T08 becomes
	// @2014-01-01T08-06:00. For these conformance tests, that offset should not
	// make the value fail comparison when the expected value also omits it.
	if (!expectedDateTime.timezone || !actualDateTime.timezone) {
		return true;
	}

	return normalizeTimezone(expectedDateTime.timezone) === normalizeTimezone(actualDateTime.timezone);
}

function parseCqlDateTime(value: string): CqlDateTimeParts | undefined {
	// DateTime literals have a T component. Date-only literals do not.
	if (!/^@\d{4}(?:-\d{2})?(?:-\d{2})?T/.test(value)) {
		return undefined;
	}

	const match = value.match(/^(.*?)(Z|[+-]\d{2}:\d{2})?$/);
	if (!match) {
		return undefined;
	}

	return {
		base: match[1],
		timezone: match[2],
	};
}

function normalizeTimezone(timezone: string): string {
	return timezone === 'Z' ? '+00:00' : timezone;
}
