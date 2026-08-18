import { ValueMap } from './value-map.js';
import { BaseExtractor } from './base-extractor.js';
import {
	declaredCqlType,
	isIntervalShaped,
	numericIntervalPointTypeOf,
	setIntervalMeta,
	type IntervalPointType,
} from '../shared/interval-utils.js';

export type ExtractOptions = {
	/** Keys that keep a single value as a one-element array after collapse. */
	singletonListKeys?: ReadonlySet<string>;
};

/** The numeric interval point type declared by the parameter's cqf-cqlType extension. */
function declaredPointType(parameter: any): IntervalPointType | undefined {
	const typeString = declaredCqlType(parameter);
	return typeString !== undefined ? numericIntervalPointTypeOf(typeString) : undefined;
}

/**
 * The point type implied by the FHIR element types of the boundary parts: `valueInteger`
 * boundaries are Integers, `valueDecimal` boundaries are Decimals. A `valueString`
 * boundary is ambiguous (a Long, or a decimal keeping its trailing zeros) and derives
 * nothing, as does a mix of boundary types.
 */
function wirePointType(parts: any[]): IntervalPointType | undefined {
	const types = new Set<IntervalPointType>();
	for (const part of parts) {
		if (part === null || typeof part !== 'object') continue;
		if (part.name !== 'low' && part.name !== 'high') continue;
		if (part.hasOwnProperty('valueInteger')) {
			types.add('Integer');
		} else if (part.hasOwnProperty('valueDecimal')) {
			types.add('Decimal');
		}
	}
	return types.size === 1 ? types.values().next().value : undefined;
}

export class ResultExtractor {
	private extractors: BaseExtractor;

	constructor(extractors: BaseExtractor) {
		this.extractors = extractors;
	}

	private _extractValues(parameters: any[], singletonListKeys: ReadonlySet<string>): ValueMap {
		const values = new ValueMap(singletonListKeys);
		for (const parameter of parameters) {
			const value = parameter.hasOwnProperty('part')
				? this._extractValues(parameter.part, singletonListKeys)
				: this.extractors.extractValue(parameter);

			// If the value is a ValueMap, convert it to a plain object/array
			const processedValue = value instanceof ValueMap ? value.toResult() : value;

			// An interval in the part-based representation (issue #85) carries no Range
			// metadata, so record the point type the wire still tells us: the declared
			// cqlType when it names a numeric interval, otherwise the FHIR element types
			// of the boundary parts. Without one of those the comparison uses the decimal
			// step, as for any untyped interval.
			if (parameter.hasOwnProperty('part') && isIntervalShaped(processedValue)) {
				const pointType =
					declaredPointType(parameter) ??
					(Array.isArray(parameter.part) ? wirePointType(parameter.part) : undefined);
				if (pointType !== undefined) {
					setIntervalMeta(processedValue, { pointType: pointType });
				}
			}

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
