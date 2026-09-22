import { BaseExtractor } from '../base-extractor.js';
import { applyDeclaredTimePrecision } from './value-type-extractor-utils.js';

export class TimeExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		return parameter.hasOwnProperty('valueTime')
			? `@T${applyDeclaredTimePrecision(parameter.valueTime.toString(), parameter._valueTime)}`
			: undefined;
	}
}
