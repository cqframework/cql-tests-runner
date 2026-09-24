import { BaseExtractor } from './base-extractor.js';

/** A CQL null result: the IG requires this on the value element with a code of `unknown`. */
const DATA_ABSENT_REASON_URL = 'http://hl7.org/fhir/StructureDefinition/data-absent-reason';
/** An empty CQL list, which FHIR cannot otherwise distinguish from an absent value. */
const IS_EMPTY_LIST_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList';
/** An empty CQL tuple, likewise. */
const IS_EMPTY_TUPLE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyTuple';

/**
 * True when the parameter carries a value of its own, either a `value[x]` or the `part`s of a
 * structured value. An absence marker describes a value that is not there, so a parameter that
 * does have one is not ours whatever its extensions say — the value is the result.
 */
function carriesValue(parameter: any): boolean {
	return Object.keys(parameter).some(
		key => (key.startsWith('value') && key.length > 'value'.length) || key === 'part'
	);
}

/**
 * Every extension that could declare the absence of a value, in the order the parameter presents
 * them: those on each primitive companion element (`_valueBoolean`, `_valueString`, …) and those
 * on the parameter itself.
 *
 * The IG places these extensions on the value element. When the value is absent there is no
 * element to hang them on, so an engine uses the companion of whatever type it would have sent —
 * `_valueBoolean` for a null Boolean, `_valueString` for a null String, and so on. Looking only at
 * `_valueBoolean`, as this extractor previously did, therefore finds a null result on some engines
 * and misses it on others; the parameter's own `extension` array is included for engines that put
 * it there instead.
 */
function absenceExtensions(parameter: any): any[] {
	const extensions: any[] = [];

	if (Array.isArray(parameter.extension)) {
		extensions.push(...parameter.extension);
	}

	for (const [key, child] of Object.entries(parameter)) {
		if (!key.startsWith('_value') || child === null || typeof child !== 'object') {
			continue;
		}
		const childExtensions = (child as any).extension;
		if (Array.isArray(childExtensions)) {
			extensions.push(...childExtensions);
		}
	}

	return extensions;
}

function isMarker(extension: any, url: string): boolean {
	return (
		extension !== null &&
		typeof extension === 'object' &&
		extension.url === url &&
		extension.valueBoolean === true
	);
}

function isDataAbsent(extension: any): boolean {
	return (
		extension !== null &&
		typeof extension === 'object' &&
		extension.url === DATA_ABSENT_REASON_URL &&
		extension.valueCode === 'unknown'
	);
}

/**
 * Extracts the results FHIR has no value for: a CQL null, an empty list and an empty tuple, each
 * declared by an extension rather than by a value.
 */
export class NullEmptyExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter === null || typeof parameter !== 'object' || carriesValue(parameter)) {
			return undefined;
		}

		// First match wins, preserving the previous behaviour for a parameter that somehow
		// declares more than one of these.
		for (const extension of absenceExtensions(parameter)) {
			if (isDataAbsent(extension)) {
				return null;
			}
			if (isMarker(extension, IS_EMPTY_LIST_URL)) {
				return [];
			}
			if (isMarker(extension, IS_EMPTY_TUPLE_URL)) {
				return {};
			}
		}

		return undefined;
	}
}
