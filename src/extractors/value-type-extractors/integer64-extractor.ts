import { BaseExtractor } from '../base-extractor.js';

export class Integer64Extractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valueInteger64')) {
			// FHIR integer64 is serialized as a JSON string; normalize in case a
			// server sends a JSON number instead.
			return String(parameter.valueInteger64);
		}

		return undefined;
	}
}
