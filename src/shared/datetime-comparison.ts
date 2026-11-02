/**
 * Equality of CQL DateTime literals as the runner compares them (cqframework/cql-tests-runner#138,
 * #83, #84).
 *
 * A DateTime always has a timezone offset during evaluation: one written without an offset takes
 * the offset of the evaluation request ("If no timezone offset is specified, the timezone offset of
 * the evaluation request timestamp is used"). Comparison follows from that. A side written without
 * an offset is read at the evaluation offset, and two DateTimes are equal when, at the same
 * precision, they denote the same instant. So `@2005-05-10T10:20:30` equals an engine's
 * `@2005-05-10T10:20:30-06:00` when the request was evaluated at -06:00, and `Z` equals `+00:00`.
 *
 * Only DateTimes with at least an hour are handled. Dates and date-precision DateTimes carry no
 * offset, and Times cannot have one, so those keep plain comparison.
 */

/** A CQL DateTime literal down to at least the hour, with an optional offset. */
const DATE_TIME_LITERAL =
	/^@(\d{4})-(\d{2})-(\d{2})T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?(Z|[+-]\d{2}:\d{2})?$/;

interface ParsedDateTime {
	/** Components present: 4 = hour, 5 = minute, 6 = second, 7 = millisecond. */
	precision: number;
	/** Milliseconds since the epoch of the wall-clock value, read as if it were UTC. */
	wallClock: number;
	/** Minutes east of UTC, or undefined when the literal has no offset. */
	offsetMinutes: number | undefined;
}

function parseOffset(offset: string): number {
	if (offset === 'Z') return 0;
	const sign = offset.startsWith('-') ? -1 : 1;
	return sign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)));
}

function parseDateTime(literal: string): ParsedDateTime | undefined {
	const match = DATE_TIME_LITERAL.exec(literal.trim());
	if (!match) return undefined;
	const [, year, month, day, hour, minute, second, fraction, offset] = match;
	const precision =
		fraction !== undefined ? 7 : second !== undefined ? 6 : minute !== undefined ? 5 : 4;
	// Fractions are compared to the millisecond, the finest precision CQL defines.
	const milliseconds = fraction !== undefined ? Number(fraction.padEnd(3, '0').slice(0, 3)) : 0;
	// Not Date.UTC: it reads years 0–99 as 1900–1999, which would make @0001 and @1901 the same
	// instant. setUTCFullYear takes the year as given.
	const wallClock = new Date(0);
	wallClock.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
	wallClock.setUTCHours(Number(hour), Number(minute ?? 0), Number(second ?? 0), milliseconds);
	return {
		precision,
		wallClock: wallClock.getTime(),
		offsetMinutes: offset !== undefined ? parseOffset(offset) : undefined,
	};
}

/**
 * Compares two DateTime literals. Returns undefined when either string is not a DateTime literal
 * with a time, so the caller can fall back to its usual comparison.
 *
 * `evaluationOffsetMinutes` is the offset the evaluation actually ran at. When it is undefined, a
 * literal without an offset only equals another without one, as before.
 */
export function dateTimeLiteralsEqual(
	expected: string,
	actual: string,
	evaluationOffsetMinutes?: number
): boolean | undefined {
	const e = parseDateTime(expected);
	const a = parseDateTime(actual);
	if (e === undefined || a === undefined) return undefined;

	// Different precisions are different values, as in plain comparison.
	if (e.precision !== a.precision) return false;

	const eOffset = e.offsetMinutes ?? evaluationOffsetMinutes;
	const aOffset = a.offsetMinutes ?? evaluationOffsetMinutes;
	if (eOffset === undefined || aOffset === undefined) {
		// No evaluation offset to read an offset-less side at: equal only if both lack one.
		return (
			e.offsetMinutes === undefined &&
			a.offsetMinutes === undefined &&
			e.wallClock === a.wallClock
		);
	}

	return e.wallClock - eOffset * 60_000 === a.wallClock - aOffset * 60_000;
}
