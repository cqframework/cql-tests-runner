import { BaseExtractor } from '../base-extractor.js';

export class StringExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valueString')) {
			return parameter.valueString;
		}

		return undefined;
	}
}
