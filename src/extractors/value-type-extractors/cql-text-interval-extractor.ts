import { BaseExtractor } from '../base-extractor.js';
import { isIntervalShaped } from '../../shared/interval-utils.js';

/** Marks a `valueString` as the CQL text of a result rather than a CQL String. */
export const CQF_CQL_TEXT_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlText';

export type CqlTextParser = (text: string) => any;

/**
 * NOT PART OF THE CQL SPECIFICATION — CQF-implementation-specific workaround.
 *
 * Some engines return a result they cannot map to a FHIR type — notably an Interval of
 * Integer, Decimal or Time — as its CQL text in `valueString`, flagged by the `cqf-cqlText`
 * extension. The CQL-to-FHIR type mapping has no entry for these types
 * (cqframework/clinical_quality_language#1832), so the text is the only form the result
 * takes on the wire, and comparing it as a string against a parsed expected interval
 * always fails.
 *
 * This extractor decodes that text back into an interval so it can be compared. It is
 * gated three ways, so it cannot claim anything else:
 * - it is only in the chain when `Debug.DecodeCqfCqlText` is enabled (the default);
 * - it only looks at a `valueString` whose `_valueString` carries `cqf-cqlText: true`;
 * - it only keeps the decoded value if it is a single interval.
 * Anything else falls through to StringExtractor unchanged.
 *
 * A list of intervals needs no special case: the engine sends one `return` parameter per
 * element, each holding one interval's text, and ValueMap gathers them into the list.
 *
 * Remove it once the type mapping gains these types and engines return FHIR `Range` /
 * `Period` values instead of CQL text.
 */
export class CqlTextIntervalExtractor extends BaseExtractor {
	constructor(private readonly parse: CqlTextParser) {
		super();
	}

	protected _process(parameter: any): any {
		if (typeof parameter.valueString !== 'string' || !isFlaggedAsCqlText(parameter)) {
			return undefined;
		}

		let decoded: any;
		try {
			decoded = this.parse(parameter.valueString);
		} catch {
			return undefined;
		}

		// cvl does not throw on text it cannot parse: it reports the syntax error and returns
		// an empty object. Checking the shape of the result is what rejects that case.
		return isIntervalShaped(decoded) ? decoded : undefined;
	}
}

function isFlaggedAsCqlText(parameter: any): boolean {
	const extensions = parameter._valueString?.extension;
	return (
		Array.isArray(extensions) &&
		extensions.some(
			(extension: any) =>
				extension?.url === CQF_CQL_TEXT_URL && extension.valueBoolean === true
		)
	);
}
