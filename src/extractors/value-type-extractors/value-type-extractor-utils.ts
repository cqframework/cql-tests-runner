/**
 * Formats a Period boundary of an `Interval<System.Date>` as a CQL Date literal.
 * Unlike `format_datetime`, no trailing `T` is appended: `@2018-01-01T` is a
 * DateTime literal, while a date interval's boundaries must stay `@2018-01-01`.
 * A time part, if an engine includes one, is an artifact of the Period mapping
 * and is stripped.
 */
export function format_date(datetime: string): string {
	const value = datetime.toString();
	const timeStart = value.indexOf('T');
	return `@${timeStart >= 0 ? value.slice(0, timeStart) : value}`;
}

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

/**
 * The FHIR `time-precision` extension
 * (http://hl7.org/fhir/StructureDefinition/time-precision, from the HL7 FHIR
 * extensions pack). FHIR `dateTime` and `time` require every time component
 * down to seconds once an hour is present, while CQL allows hour- and
 * minute-precision values; an engine emitting valid FHIR therefore zero-pads the
 * missing components and records the real precision in this extension on the
 * primitive element (`_valueDateTime`, `_valueTime`, `_start`, `_end`).
 */
export const TIME_PRECISION_URL = 'http://hl7.org/fhir/StructureDefinition/time-precision';

/** The time-precision codes the runner understands, from the UCUM time-duration codes. */
export type TimePrecision = 'h' | 'min' | 's' | 'ms';

const TIME_PRECISIONS: ReadonlySet<string> = new Set<TimePrecision>(['h', 'min', 's', 'ms']);

/**
 * The precision declared by a `time-precision` extension on a FHIR primitive
 * element (the `_name` companion of `name` in FHIR JSON), or `undefined` when
 * the element carries no such extension or its code is not a time precision.
 */
export function declaredTimePrecision(element: any): TimePrecision | undefined {
	if (element === null || typeof element !== 'object' || !Array.isArray(element.extension)) {
		return undefined;
	}
	const extension = element.extension.find(
		(e: any) => e !== null && typeof e === 'object' && e.url === TIME_PRECISION_URL
	);
	const code = extension?.valueCode;
	return typeof code === 'string' && TIME_PRECISIONS.has(code)
		? (code as TimePrecision)
		: undefined;
}

// A time-of-day in a FHIR dateTime/time lexical value, split into the components a
// precision code may drop and the timezone offset that stays regardless of precision.
const TIME_OF_DAY = /^(\d{2})(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Drops the time components a FHIR dateTime or time value carries only because FHIR
 * requires them, so the result reads as the CQL value at its declared precision:
 * `2014-01-01T10:00:00Z` declared at `h` becomes `2014-01-01T10Z`, and `10:00:00`
 * declared at `min` becomes `10:00`. The value is returned unchanged when no
 * precision is declared, when it has no time-of-day, or when it is already at or
 * coarser than the declared precision. A timezone offset is kept as is.
 *
 * `primitiveElement` is the FHIR JSON companion element (`_valueDateTime`,
 * `_start`, …) that carries the extensions of the primitive.
 */
export function applyDeclaredTimePrecision(value: string, primitiveElement: any): string {
	const precision = declaredTimePrecision(primitiveElement);
	if (precision === undefined) {
		return value;
	}
	const text = value.toString();
	const timeStart = text.indexOf('T');
	// A FHIR time has no date part and no 'T'; a FHIR dateTime has both.
	const datePart = timeStart >= 0 ? text.slice(0, timeStart + 1) : '';
	const timePart = timeStart >= 0 ? text.slice(timeStart + 1) : text;
	const match = TIME_OF_DAY.exec(timePart);
	if (match === null) {
		return value;
	}
	const [, hours, minutes, seconds, fraction, offset] = match;
	const components = [hours];
	if (precision !== 'h' && minutes !== undefined) {
		components.push(minutes);
	}
	if (precision !== 'h' && precision !== 'min' && seconds !== undefined) {
		components.push(seconds);
	}
	let time = components.join(':');
	if (precision === 'ms' && fraction !== undefined) {
		time = `${time}${fraction}`;
	}
	return `${datePart}${time}${offset ?? ''}`;
}
