/**
 * The evaluation request timestamp for a test (cqframework/cql-tests-runner#138).
 *
 * CQL evaluates every request against an evaluation request timestamp: `Now()`, `Today()` and
 * `TimeOfDay()` return it, and a DateTime built without a timezone offset takes its offset. A test
 * can fix the timestamp with `evaluationDateTime`, or only its offset with
 * `evaluationTimezoneOffset` (cqframework/cql-tests#28). With neither, the offset is UTC — not the
 * runner's or the server's local zone — so a run does not depend on where it happens.
 */

/** Offset used when a test specifies neither attribute. */
export const DEFAULT_TIMEZONE_OFFSET_MINUTES = 0;

/** The `timestamp` input of the $cql and Library/$evaluate operations in Using CQL With FHIR. */
export const TIMESTAMP_PARAMETER_NAME = 'timestamp';

/**
 * HTTP header for the client timezone (FHIR R5 http.html#timezones, draft-sharhalakis-httptz):
 * an RFC 3339 local date-time that carries the offset.
 */
export const TIMEZONE_HEADER_NAME = 'Timezone';

export interface EvaluationTimingAttributes {
	evaluationDateTime?: string;
	evaluationTimezoneOffset?: string;
}

export type EvaluationTiming =
	{ ok: true; timestamp: string; offsetMinutes: number } | { ok: false; message: string };

// Offsets are written either the FHIR/ISO way (`Z`, `-06:00`, `+05:30`) or as CQL writes them, in
// decimal hours (`-6`, `-6.0`, `5.5`). cql-tests#28 does not fix a format; the two cannot be
// confused, so both are accepted.
const ISO_OFFSET = /^(?:Z|([+-])(\d{2}):(\d{2}))$/;
const DECIMAL_HOURS_OFFSET = /^[+-]?\d{1,2}(?:\.\d+)?$/;

// A date-time down to at least the minute, optionally written as a CQL literal (`@...`). The
// offset is optional; without one the default offset applies.
const DATE_TIME =
	/^@?(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/;

/** Real-world offsets run from -12:00 to +14:00. */
const MAX_OFFSET_MINUTES = 14 * 60;

/** Parses a timezone offset to minutes east of UTC, or undefined if it is not a valid offset. */
export function parseTimezoneOffset(value: string): number | undefined {
	const text = value.trim();

	const iso = ISO_OFFSET.exec(text);
	if (iso) {
		if (text === 'Z') return 0;
		const hours = Number(iso[2]);
		const minutes = Number(iso[3]);
		if (minutes >= 60) return undefined;
		const total = (iso[1] === '-' ? -1 : 1) * (hours * 60 + minutes);
		return Math.abs(total) <= MAX_OFFSET_MINUTES ? total : undefined;
	}

	if (DECIMAL_HOURS_OFFSET.test(text)) {
		const total = Math.round(Number(text) * 60);
		return Math.abs(total) <= MAX_OFFSET_MINUTES ? total : undefined;
	}

	return undefined;
}

/** Formats minutes east of UTC as `Z` or `±HH:MM`. */
export function formatTimezoneOffset(offsetMinutes: number): string {
	if (offsetMinutes === 0) return 'Z';
	const sign = offsetMinutes < 0 ? '-' : '+';
	const absolute = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
	const minutes = String(absolute % 60).padStart(2, '0');
	return `${sign}${hours}:${minutes}`;
}

/** Expresses an instant as a FHIR dateTime in the given offset, to the millisecond. */
export function formatInstantAtOffset(instant: Date, offsetMinutes: number): string {
	const shifted = new Date(instant.getTime() + offsetMinutes * 60_000);
	// toISOString renders the shifted instant as if it were UTC; swap its `Z` for the offset.
	return shifted.toISOString().replace(/Z$/, formatTimezoneOffset(offsetMinutes));
}

/**
 * Resolves the timestamp a test is evaluated at. `runInstant` is the start of the run, so every
 * test that does not fix its own timestamp shares one instant, each expressed in its own offset.
 */
export function resolveEvaluationTiming(
	attributes: EvaluationTimingAttributes,
	runInstant: Date
): EvaluationTiming {
	const { evaluationDateTime, evaluationTimezoneOffset } = attributes;

	// An evaluationDateTime already carries an offset, so a second one could only contradict it.
	if (evaluationDateTime !== undefined && evaluationTimezoneOffset !== undefined) {
		return {
			ok: false,
			message:
				'A test cannot specify both evaluationDateTime and evaluationTimezoneOffset; ' +
				'an evaluationDateTime already carries its timezone offset',
		};
	}

	if (evaluationDateTime !== undefined) {
		const match = DATE_TIME.exec(evaluationDateTime.trim());
		if (!match) {
			return {
				ok: false,
				message: `evaluationDateTime '${evaluationDateTime}' is not a date-time with at least minute precision`,
			};
		}
		const [, year, month, day, hour, minute, second, fraction, offset] = match;
		const offsetMinutes =
			offset !== undefined ? parseTimezoneOffset(offset) : DEFAULT_TIMEZONE_OFFSET_MINUTES;
		if (offsetMinutes === undefined) {
			return {
				ok: false,
				message: `evaluationDateTime '${evaluationDateTime}' has an invalid timezone offset`,
			};
		}
		// A FHIR dateTime with a time needs seconds and an offset.
		const timestamp =
			`${year}-${month}-${day}T${hour}:${minute}:${second ?? '00'}${fraction ?? ''}` +
			formatTimezoneOffset(offsetMinutes);
		// The pattern checks shape only; this rejects impossible values such as month 13. A
		// rolled-over date (Feb 30 becoming Mar 2) is caught by comparing the day back.
		const parsed = new Date(timestamp);
		const dayAtOffset = new Date(parsed.getTime() + offsetMinutes * 60_000).getUTCDate();
		if (Number.isNaN(parsed.getTime()) || dayAtOffset !== Number(day)) {
			return {
				ok: false,
				message: `evaluationDateTime '${evaluationDateTime}' is not a valid date-time`,
			};
		}
		return { ok: true, timestamp, offsetMinutes };
	}

	if (evaluationTimezoneOffset !== undefined) {
		const offsetMinutes = parseTimezoneOffset(evaluationTimezoneOffset);
		if (offsetMinutes === undefined) {
			return {
				ok: false,
				message:
					`evaluationTimezoneOffset '${evaluationTimezoneOffset}' is not a timezone offset ` +
					"(expected 'Z', '±HH:MM', or decimal hours such as '-6.0')",
			};
		}
		return {
			ok: true,
			timestamp: formatInstantAtOffset(runInstant, offsetMinutes),
			offsetMinutes,
		};
	}

	return {
		ok: true,
		timestamp: formatInstantAtOffset(runInstant, DEFAULT_TIMEZONE_OFFSET_MINUTES),
		offsetMinutes: DEFAULT_TIMEZONE_OFFSET_MINUTES,
	};
}
