import { BaseExtractor } from '../base-extractor.js';
import { IntervalMeta, IntervalPointType, setIntervalMeta } from '../../shared/interval-utils.js';

const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';
const PRECISION_URL = 'http://hl7.org/fhir/StructureDefinition/quantity-precision';
const UCUM_SYSTEM = 'http://unitsofmeasure.org';
const NUMERIC_INTERVAL_TYPE = /^Interval<(?:System\.)?(Integer|Long|Decimal)>$/;

function cqlType(parameter: any): string | undefined {
	if (!Array.isArray(parameter.extension)) {
		return undefined;
	}
	const extension = parameter.extension.find((e: any) => e !== null && typeof e === 'object' && e.url === CQL_TYPE_URL);
	return extension !== undefined && typeof extension.valueString === 'string' ? extension.valueString : undefined;
}

/** A unity Quantity: code "1" in UCUM with no human-readable unit (FHIR-56226). */
function isUnityQuantity(quantity: any): boolean {
	return (
		quantity !== null &&
		typeof quantity === 'object' &&
		quantity.code === '1' &&
		quantity.system === UCUM_SYSTEM &&
		!quantity.hasOwnProperty('unit')
	);
}

function precisionExtension(extensions: any): number | undefined {
	if (!Array.isArray(extensions)) {
		return undefined;
	}
	const extension = extensions.find((e: any) => e !== null && typeof e === 'object' && e.url === PRECISION_URL);
	return extension !== undefined && typeof extension.valueInteger === 'number' ? extension.valueInteger : undefined;
}

/**
 * Decimal places declared for a boundary: the quantity-precision extension on the
 * Quantity itself (as in the FHIR-56226 example) or on Quantity.value as a primitive
 * extension, falling back to the digits of a string-encoded value.
 */
function precisionOf(quantity: any): number | undefined {
	const declared =
		precisionExtension(quantity.extension) ??
		precisionExtension(quantity._value !== null && typeof quantity._value === 'object' ? quantity._value.extension : undefined);
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
	return typeof quantity.value === 'string' ? Number(quantity.value) : quantity.value;
}

export class NumericIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (!parameter.hasOwnProperty('valueRange')) {
			return undefined;
		}

		const range = parameter.valueRange;
		if (range === null || typeof range !== 'object') {
			return undefined;
		}

		const lowQuantity = range.hasOwnProperty('low') ? range.low : undefined;
		const highQuantity = range.hasOwnProperty('high') ? range.high : undefined;
		if (lowQuantity === undefined && highQuantity === undefined) {
			// Nothing to type; leave empty ranges to the existing extractors.
			return undefined;
		}

		let pointType: IntervalPointType | undefined = undefined;
		const declaredType = cqlType(parameter);
		if (declaredType !== undefined) {
			// The cqlType extension is authoritative: a non-numeric interval type is not ours.
			const match = NUMERIC_INTERVAL_TYPE.exec(declaredType);
			if (match === null) {
				return undefined;
			}
			pointType = match[1] as IntervalPointType;
		} else {
			const boundaries = [lowQuantity, highQuantity].filter((q) => q !== undefined);
			if (!boundaries.every(isUnityQuantity)) {
				return undefined;
			}
		}

		const low = lowQuantity !== undefined ? boundaryValue(lowQuantity) : null;
		const high = highQuantity !== undefined ? boundaryValue(highQuantity) : null;

		const result = {
			lowClosed: low !== null,
			low: low,
			highClosed: high !== null,
			high: high,
		};

		const meta: IntervalMeta = {};
		if (pointType !== undefined) {
			meta.pointType = pointType;
		}
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
