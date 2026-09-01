import { BaseExtractor } from '../base-extractor.js';

/**
 * A Range boundary as the CQL Quantity shape CVL produces: `{value, unit}`.
 *
 * The unit is taken from `Quantity.code` — the coded, comparable form — falling back to
 * `Quantity.unit` when a boundary carries only the human-readable unit, so a dimensioned
 * boundary is not silently reduced to a unitless one. A boundary that is absent, not an object,
 * or carries no `value` is treated as no boundary at all rather than throwing.
 */
function boundaryQuantity(value: any): { value: any; unit: any } | null {
	if (value === null || typeof value !== 'object' || !value.hasOwnProperty('value')) {
		return null;
	}
	const unit = value.hasOwnProperty('code')
		? value.code
		: value.hasOwnProperty('unit')
			? value.unit
			: null;
	return { value: value.value, unit: unit };
}

/**
 * Extracts a `valueRange` as an `Interval<Quantity>`. This is the fallback for any Range that
 * NumericIntervalExtractor did not claim: per the IG a result carrying no `cqf-cqlType` is read as
 * the FHIR type, and the CQL type mapped to `FHIR.Range` with quantity boundaries is
 * `Interval<Quantity>`.
 */
export class QuantityIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (!parameter.hasOwnProperty('valueRange')) {
			return undefined;
		}

		const range = parameter.valueRange;
		if (range === null || typeof range !== 'object') {
			return undefined;
		}

		const low = range.hasOwnProperty('low') ? boundaryQuantity(range.low) : null;
		const high = range.hasOwnProperty('high') ? boundaryQuantity(range.high) : null;

		return {
			lowClosed: low !== null,
			low: low,
			highClosed: high !== null,
			high: high,
		};
	}
}
