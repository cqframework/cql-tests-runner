import { BaseExtractor } from '../base-extractor.js';
import { IntervalMeta, IntervalPointType, setIntervalMeta } from '../../shared/interval-utils.js';

const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';
const PRECISION_URL = 'http://hl7.org/fhir/StructureDefinition/quantity-precision';
const NUMERIC_INTERVAL_TYPE = /^Interval<(?:System\.)?(Integer|Long|Decimal)>$/;

function cqlType(parameter: any): string | undefined {
	if (!Array.isArray(parameter.extension)) {
		return undefined;
	}
	const extension = parameter.extension.find(
		(e: any) => e !== null && typeof e === 'object' && e.url === CQL_TYPE_URL
	);
	return extension !== undefined && typeof extension.valueString === 'string'
		? extension.valueString
		: undefined;
}

function precisionExtension(extensions: any): number | undefined {
	if (!Array.isArray(extensions)) {
		return undefined;
	}
	const extension = extensions.find(
		(e: any) => e !== null && typeof e === 'object' && e.url === PRECISION_URL
	);
	return extension !== undefined && typeof extension.valueInteger === 'number'
		? extension.valueInteger
		: undefined;
}

/**
 * Decimal places declared for a boundary: the quantity-precision extension on the
 * Quantity itself (as in the FHIR-56226 example) or on Quantity.value as a primitive
 * extension, falling back to the digits of a string-encoded value.
 */
function precisionOf(quantity: any): number | undefined {
	const declared =
		precisionExtension(quantity.extension) ??
		precisionExtension(
			quantity._value !== null && typeof quantity._value === 'object'
				? quantity._value.extension
				: undefined
		);
	if (declared !== undefined) {
		return declared;
	}

	if (typeof quantity.value === 'string') {
		const separator = quantity.value.indexOf('.');
		if (separator >= 0) {
			return quantity.value.length - separator - 1;
		}
	}

	return undefined;
}

function boundaryValue(quantity: any): number | null {
	if (quantity === null || typeof quantity !== 'object' || !quantity.hasOwnProperty('value')) {
		return null;
	}
	const value = typeof quantity.value === 'string' ? Number(quantity.value) : quantity.value;
	// A value that is missing or not numeric makes the boundary unusable; treat it as
	// absent so the closed flag stays consistent and no NaN/undefined reaches comparison.
	return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/**
 * Extracts a `valueRange` that represents a numeric CQL interval
 * (`Interval<Integer|Long|Decimal>`, FHIR-56226) into the plain-number shape CVL
 * produces: `{lowClosed, low, highClosed, high}`.
 *
 * Detection is strict: the parameter must carry a `cqf-cqlType` extension naming
 * `Interval<Integer>`, `Interval<Long>` or `Interval<Decimal>` (the `System.` prefix is
 * optional). Any other `valueRange` — including one whose boundaries are unity quantities
 * (`code: "1"`, UCUM) but which declares no cqlType — is left to
 * `QuantityIntervalExtractor`. FHIR-56226 only defines the forward mapping, and unity
 * coding alone is ambiguous with a dimensionless `Interval<Quantity>`.
 */
export class NumericIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (!parameter.hasOwnProperty('valueRange')) {
			return undefined;
		}

		const range = parameter.valueRange;
		if (range === null || typeof range !== 'object') {
			return undefined;
		}

		// The cqlType extension is required and authoritative: without a numeric interval
		// type this range is not ours, whatever its boundaries look like.
		const declaredType = cqlType(parameter);
		const match = declaredType !== undefined ? NUMERIC_INTERVAL_TYPE.exec(declaredType) : null;
		if (match === null) {
			return undefined;
		}
		const pointType = match[1] as IntervalPointType;

		const lowQuantity = range.hasOwnProperty('low') ? range.low : undefined;
		const highQuantity = range.hasOwnProperty('high') ? range.high : undefined;

		const low = lowQuantity !== undefined ? boundaryValue(lowQuantity) : null;
		const high = highQuantity !== undefined ? boundaryValue(highQuantity) : null;

		const result = {
			lowClosed: low !== null,
			low: low,
			highClosed: high !== null,
			high: high,
		};

		const meta: IntervalMeta = { pointType: pointType };
		const lowPrecision = low !== null ? precisionOf(lowQuantity) : undefined;
		if (lowPrecision !== undefined) {
			meta.lowPrecision = lowPrecision;
		}
		const highPrecision = high !== null ? precisionOf(highQuantity) : undefined;
		if (highPrecision !== undefined) {
			meta.highPrecision = highPrecision;
		}
		setIntervalMeta(result, meta);

		return result;
	}
}
