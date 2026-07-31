/**
 * Formats a Period boundary of an `Interval<System.Time>` as a CQL Time literal.
 * FHIR Period boundaries are dateTimes, so engines anchor the time-of-day to a
 * placeholder date (e.g. 0001-01-01); that date — and any timezone offset, which
 * a CQL Time cannot carry — is an artifact of the mapping and is stripped.
 */
export function format_time(datetime: string): string {
	const value = datetime.toString();
	const timeStart = value.indexOf('T');
	const time = timeStart >= 0 ? value.slice(timeStart + 1) : value;
	return `@T${time.replace(/(?:Z|[+-]\d{2}:\d{2})$/, '')}`;
}

export function format_datetime(datetime: string): string {
	let dt = `@${datetime.toString()}`;
	if (dt.length <= 11) {
		// append a 'T' to indicate this is a DateTime literal
		dt = `${dt}T`;
	}
	return dt;
}
