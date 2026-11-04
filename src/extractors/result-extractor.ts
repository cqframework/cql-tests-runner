import { ValueMap } from './value-map.js';
import { BaseExtractor } from './base-extractor.js';
import {
	declaredCqlType,
	isIntervalShaped,
	numericIntervalPointTypeOf,
	setIntervalMeta,
	type IntervalPointType,
} from '../shared/interval-utils.js';
import { listElementType, parseCqlType, type CqlType } from '../shared/cql-type.js';

export type ExtractOptions = {
	/** Keys that keep a single value as a one-element array after collapse. */
	singletonListKeys?: ReadonlySet<string>;
};

/** The numeric point type implied by the parameter's scalar or interval cqlType. */
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

/** True when a parameter carries a value: a `value[x]`, parts or a resource. */
function hasValue(parameter: any): boolean {
	return Object.keys(parameter).some(
		key => key.startsWith('value') || key === 'part' || key === 'resource'
	);
}

/**
 * What the declared types say about one level of parameters: the keys known to hold a list
 * (`true`) or a single value (`false`), and the type of each parameter's own content, for
 * the level below. Keys and parameters missing from the maps fall back to the
 * expected-shape hint (issue #82).
 */
type LevelShape = {
	lists: Map<string, boolean>;
	contentTypes: Map<any, CqlType>;
};

const UNKNOWN_SHAPE: LevelShape = { lists: new Map(), contentTypes: new Map() };

/**
 * True when the declared type can't settle the shape of a list level (the `return`s of a
 * response, or the `element` parts of a nested list): a lone entry with no value. That's how
 * an empty list, a null list and a list holding one null all come over (on cql-execution's
 * wire `Tail(null)` and `{null}` are identical), so the shape is left to the hint.
 */
function listLevelIsAmbiguous(entries: any[]): boolean {
	return entries.length === 1 && !hasValue(entries[0]);
}

/**
 * The shape of a response's top level, from the `cqf-cqlType` of its `return` parameters
 * (issue #150). Every `return` declaring `List<T>` makes the result a list, even with one
 * element, and every one declaring another type makes it a single value. No declared type,
 * an unreadable one, or a mix of the two leaves the decision to the hint.
 */
function topLevelShape(parameters: any[]): LevelShape {
	const returns = parameters.filter((p: any) => p?.name === 'return');
	if (returns.length === 0 || listLevelIsAmbiguous(returns)) return UNKNOWN_SHAPE;

	const types = returns.map((p: any) => {
		const declared = declaredCqlType(p);
		return declared !== undefined ? parseCqlType(declared) : undefined;
	});
	if (types.some(t => t === undefined)) return UNKNOWN_SHAPE;

	const elementTypes = types.map(t => listElementType(t));
	const listCount = elementTypes.filter(t => t !== undefined).length;
	if (listCount !== 0 && listCount !== types.length) return UNKNOWN_SHAPE;

	const isList = listCount === types.length;
	const contentTypes = new Map<any, CqlType>();
	returns.forEach((p: any, i: number) =>
		contentTypes.set(p, (isList ? elementTypes[i] : types[i]) as CqlType)
	);
	return { lists: new Map([['return', isList]]), contentTypes: contentTypes };
}

/**
 * The shape of the parts of a parameter whose own type is known. Only the top-level
 * `return`s declare a type, so the type of a nested value comes from its parent's: the
 * parts of a `List<T>` are `element`s of type T, and the parts of a Tuple are its fields.
 */
function partsShape(parts: any[], type: CqlType | undefined): LevelShape {
	const elementType = listElementType(type);
	if (elementType !== undefined) {
		const elements = parts.filter((p: any) => p?.name === 'element');
		if (elements.length === 0 || listLevelIsAmbiguous(elements)) return UNKNOWN_SHAPE;
		return {
			lists: new Map([['element', true]]),
			contentTypes: new Map(elements.map((p: any) => [p, elementType])),
		};
	}
	if (type?.fields !== undefined) {
		const lists = new Map<string, boolean>();
		const contentTypes = new Map<any, CqlType>();
		for (const part of parts) {
			const fieldType = type.fields.get(part?.name);
			if (fieldType === undefined) continue;
			lists.set(part.name, false);
			contentTypes.set(part, fieldType);
		}
		return { lists: lists, contentTypes: contentTypes };
	}
	return UNKNOWN_SHAPE;
}

/** The hint's singleton-list keys, overridden by what the declared types say. */
function effectiveListKeys(hint: ReadonlySet<string>, shape: LevelShape): ReadonlySet<string> {
	if (shape.lists.size === 0) return hint;
	const keys = new Set(hint);
	for (const [key, isList] of shape.lists) {
		if (isList) keys.add(key);
		else keys.delete(key);
	}
	return keys;
}

export class ResultExtractor {
	private extractors: BaseExtractor;

	constructor(extractors: BaseExtractor) {
		this.extractors = extractors;
	}

	private _extractValues(
		parameters: any[],
		singletonListKeys: ReadonlySet<string>,
		shape: LevelShape
	): ValueMap {
		const values = new ValueMap(effectiveListKeys(singletonListKeys, shape));
		for (const parameter of parameters) {
			const value = parameter.hasOwnProperty('part')
				? this._extractValues(
						parameter.part,
						singletonListKeys,
						partsShape(parameter.part, shape.contentTypes.get(parameter))
					)
				: this.extractors.extractValue(parameter);

			// If the value is a ValueMap, convert it to a plain object/array
			const processedValue = value instanceof ValueMap ? value.toResult() : value;

			// An interval in the part-based representation (issue #85) carries no Range
			// metadata, so record the point type the wire still tells us: the declared
			// cqlType when it names a numeric scalar (an uncertainty) or interval, otherwise
			// the FHIR element types of the boundary parts. Without one of those the
			// comparison uses the decimal step, as for any untyped interval.
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
		const extracted_values = this._extractValues(
			response.parameter,
			singletonListKeys,
			topLevelShape(response.parameter)
		);
		return extracted_values.toResult();
	}
}
