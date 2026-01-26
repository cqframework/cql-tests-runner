import { BaseExtractor } from './base-extractor.js';

export class NullEmptyExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (
			!parameter.hasOwnProperty('_valueBoolean') ||
			!parameter._valueBoolean.hasOwnProperty('extension')
		) {
			return undefined;
		}

		for (const extension of parameter._valueBoolean.extension) {
			if (
				extension.hasOwnProperty('url') &&
				extension.url === 'http://hl7.org/fhir/StructureDefinition/data-absent-reason' &&
				extension.hasOwnProperty('valueCode') &&
				extension.valueCode === 'unknown'
			) {
				return null;
			}

			if (
				extension.hasOwnProperty('url') &&
				extension.url === 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList' &&
				extension.hasOwnProperty('valueBoolean') &&
				extension.valueBoolean
			) {
				return [];
			}

			if (
				extension.hasOwnProperty('url') &&
				extension.url === 'http://hl7.org/fhir/StructureDefinition/cqf-isEmptyTuple' &&
				extension.hasOwnProperty('valueBoolean') &&
				extension.valueBoolean
			) {
				return {};
			}
		}

		return undefined;
	}
}
