import { BaseExtractor } from '../base-extractor.js';

export class DateExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		return parameter.hasOwnProperty('valueDate') ? `@${parameter.valueDate}` : undefined;
	}
}
