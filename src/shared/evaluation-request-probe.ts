import {
	DEFAULT_TIMEZONE_OFFSET_MINUTES,
	TIMESTAMP_PARAMETER_NAME,
	TIMEZONE_HEADER_NAME,
	formatInstantAtOffset,
	formatTimezoneOffset,
	parseTimezoneOffset,
} from './evaluation-context.js';

/**
 * Whether the server acts on the evaluation request timestamp and timezone the runner sends.
 * `null` means it could not be determined (the probe failed, or the operation cannot be probed).
 *
 * Recorded with the results so that a DateTime failure can be read correctly: against a server
 * that ignores both, results are computed in the server's own zone, whatever the test asked for.
 */
export interface EvaluationRequestSupport {
	defaultTimezoneOffset: string;
	timestampParameterHonored: boolean | null;
	timezoneHeaderHonored: boolean | null;
	/**
	 * The offset the server evaluates at when it honours neither mechanism, as observed from a
	 * DateTime written without an offset. `null` when the server honours the request (so the
	 * requested offset applies) or when it could not be determined.
	 */
	serverTimezoneOffset: string | null;
}

const PROBE_TIMEOUT_MS = 10_000;

// A timestamp no server clock will produce by accident, and an offset (Nepal, +05:45) that is
// unlikely to be any server's own zone, so neither probe can pass by coincidence.
const PROBE_TIMESTAMP = '2000-01-01T00:00:00.000Z';
const PROBE_OFFSET_MINUTES = 5 * 60 + 45;

async function evaluate(
	apiUrl: string,
	expression: string,
	extraParameters: any[],
	headers: Record<string, string>
): Promise<string | undefined> {
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify({
			resourceType: 'Parameters',
			parameter: [{ name: 'expression', valueString: expression }, ...extraParameters],
		}),
		signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
	});
	const body: any = await response.json();
	const value = body?.parameter?.find((p: any) => p?.name === 'return')?.valueDateTime;
	return typeof value === 'string' ? value : undefined;
}

/** `Now()` returns the evaluation request timestamp, so it equals the one sent iff it was used. */
async function probeTimestampParameter(apiUrl: string): Promise<boolean | null> {
	try {
		const now = await evaluate(
			apiUrl,
			'Now()',
			[{ name: TIMESTAMP_PARAMETER_NAME, valueDateTime: PROBE_TIMESTAMP }],
			{}
		);
		if (now === undefined) return null;
		return new Date(now).getTime() === new Date(PROBE_TIMESTAMP).getTime();
	} catch {
		return null;
	}
}

/**
 * A DateTime written without an offset takes the request's offset, so it shows whether the header
 * was used, and, when it was not, which offset the server evaluates at instead.
 */
async function probeTimezoneHeader(
	apiUrl: string
): Promise<{ honored: boolean | null; observedOffset: string | null }> {
	try {
		const value = await evaluate(apiUrl, '@2005-05-10T10:20:30', [], {
			[TIMEZONE_HEADER_NAME]: formatInstantAtOffset(new Date(), PROBE_OFFSET_MINUTES),
		});
		const offset = value?.match(/(?:Z|[+-]\d{2}:\d{2})$/)?.[0];
		if (offset === undefined) return { honored: null, observedOffset: null };
		return {
			honored: offset === formatTimezoneOffset(PROBE_OFFSET_MINUTES),
			observedOffset: formatTimezoneOffset(parseTimezoneOffset(offset)!),
		};
	} catch {
		return { honored: null, observedOffset: null };
	}
}

/**
 * Probes the server once per run. Only `$cql` can be probed: Library/$evaluate needs a published
 * library to evaluate, so for it both answers are left undetermined.
 */
export async function probeEvaluationRequestSupport(
	apiUrl: string,
	cqlOperation: string
): Promise<EvaluationRequestSupport> {
	const defaultTimezoneOffset = formatTimezoneOffset(DEFAULT_TIMEZONE_OFFSET_MINUTES);
	if (cqlOperation !== '$cql') {
		return {
			defaultTimezoneOffset,
			timestampParameterHonored: null,
			timezoneHeaderHonored: null,
			serverTimezoneOffset: null,
		};
	}
	const [timestampParameterHonored, header] = await Promise.all([
		probeTimestampParameter(apiUrl),
		probeTimezoneHeader(apiUrl),
	]);
	// The server's own offset only matters when it ignores both mechanisms; then it is the offset
	// every request is actually evaluated at.
	const ignoresRequest = timestampParameterHonored === false && header.honored === false;
	return {
		defaultTimezoneOffset,
		timestampParameterHonored,
		timezoneHeaderHonored: header.honored,
		serverTimezoneOffset: ignoresRequest ? header.observedOffset : null,
	};
}

/**
 * The offset a test's evaluation actually ran at: the one requested, unless the server is known to
 * ignore requested offsets, in which case its own. Used to read expected DateTimes written without
 * an offset, so a result is judged against the evaluation that produced it.
 */
export function effectiveEvaluationOffsetMinutes(
	support: EvaluationRequestSupport | undefined,
	requestedOffsetMinutes: number
): number {
	const serverOffset =
		support?.serverTimezoneOffset != null
			? parseTimezoneOffset(support.serverTimezoneOffset)
			: undefined;
	return serverOffset ?? requestedOffsetMinutes;
}
