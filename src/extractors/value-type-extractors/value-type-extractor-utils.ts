export function format_datetime(datetime: string): string {
	let dt = `@${datetime.toString()}`;
	if (dt.length <= 11) {
		// append a 'T' to indicate this is a DateTime literal
		dt = `${dt}T`;
	}
	return dt;
}
