import { BaseExtractor } from '../base-extractor.js';

export class ConceptExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (
			!parameter.hasOwnProperty('valueCodeableConcept') ||
			!parameter.valueCodeableConcept.hasOwnProperty('coding')
		) {
			return undefined;
		}

		const codes: any[] = [];
		for (const coding of parameter.valueCodeableConcept.coding) {
			codes.push({
				code: coding.code,
				system: coding.system,
				version: coding.version,
				display: coding.display,
			});
		}

		return {
			codes: codes,
			display: parameter.valueCodeableConcept.text,
		};
	}
}
