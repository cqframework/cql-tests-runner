import { ValueMap } from './value-map.js';
import { BaseExtractor } from './base-extractor.js';

export type ExtractOptions = {
	/** Keys that keep a single value as a one-element array after collapse. */
	singletonListKeys?: ReadonlySet<string>;
};

export class ResultExtractor {
	private extractors: BaseExtractor;

	constructor(extractors: BaseExtractor) {
		this.extractors = extractors;
	}

	private _extractValues(
		parameters: any[],
		singletonListKeys: ReadonlySet<string>
	): ValueMap {
		const values = new ValueMap(singletonListKeys);
		for (const parameter of parameters) {
			const value = parameter.hasOwnProperty('part')
				? this._extractValues(parameter.part, singletonListKeys)
				: this.extractors.extractValue(parameter);

			// If the value is a ValueMap, convert it to a plain object/array
			const processedValue = value instanceof ValueMap ? value.toResult() : value;
			values.add(parameter.name, processedValue);
		}
		return values;
	}

	extract(response: any, options?: ExtractOptions): any {
		if (!response.hasOwnProperty('resourceType') || response.resourceType !== 'Parameters') {
			// Anything that can't be structured directly, return as the actual output...
			return JSON.stringify(response);
		}

		if (!response.hasOwnProperty('parameter')) {
			return 'undefined';
		}

		const singletonListKeys = options?.singletonListKeys ?? new Set<string>();
		const extracted_values = this._extractValues(response.parameter, singletonListKeys);
		return extracted_values.toResult();
	}
}
