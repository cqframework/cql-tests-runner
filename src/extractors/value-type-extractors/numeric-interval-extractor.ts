import { BaseExtractor } from '../base-extractor.js';
import {
	IntervalMeta,
	IntervalPointType,
	declaredCqlType,
	numericIntervalPointTypeOf,
	setIntervalMeta,
} from '../../shared/interval-utils.js';

const PRECISION_URL = 'http://hl7.org/fhir/StructureDefinition/quantity-precision';

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

const INTEGER_LITERAL = /^[+-]?\d+$/;

function boundaryValue(quantity: any, pointType: IntervalPointType): number | bigint | null {
	if (quantity === null || typeof quantity !== 'object' || !quantity.hasOwnProperty('value')) {
		return null;
	}

	// Long boundaries are extracted as BigInt to match the CVL-parsed expected values:
	// Number() would round above 2^53. Exactness beyond that requires the engine to send
	// the value as a JSON string — a bare JSON number has already been rounded by the
	// JSON parser before it reaches this extractor.
	if (pointType === 'Long') {
		if (typeof quantity.value === 'string' && INTEGER_LITERAL.test(quantity.value)) {
			return BigInt(quantity.value);
		}
		const value = typeof quantity.value === 'string' ? Number(quantity.value) : quantity.value;
		return typeof value === 'number' && Number.isInteger(value) ? BigInt(value) : null;
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
		const declaredType = declaredCqlType(parameter);
		const pointType =
			declaredType !== undefined ? numericIntervalPointTypeOf(declaredType) : undefined;
		if (pointType === undefined) {
			return undefined;
		}

		const lowQuantity = range.hasOwnProperty('low') ? range.low : undefined;
		const highQuantity = range.hasOwnProperty('high') ? range.high : undefined;

		const low = lowQuantity !== undefined ? boundaryValue(lowQuantity, pointType) : null;
		const high = highQuantity !== undefined ? boundaryValue(highQuantity, pointType) : null;

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
