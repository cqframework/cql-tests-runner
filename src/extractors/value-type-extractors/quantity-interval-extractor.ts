import { BaseExtractor } from '../base-extractor.js';

export class QuantityIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		function getQuantity(value: any): any {
			if (value.hasOwnProperty('value')) {
				return {
					value: value.value,
					unit: value.hasOwnProperty('code') ? value.code : null,
				};
			}

			return null;
		}

		if (parameter.hasOwnProperty('valueRange')) {
			const low = parameter.valueRange.hasOwnProperty('low')
				? getQuantity(parameter.valueRange.low)
				: null;

			const high = parameter.valueRange.hasOwnProperty('high')
				? getQuantity(parameter.valueRange.high)
				: null;

			return {
				lowClosed: low !== null,
				low: low,
				highClosed: high !== null,
				high: high,
			};
		}

		return undefined;
	}
}
