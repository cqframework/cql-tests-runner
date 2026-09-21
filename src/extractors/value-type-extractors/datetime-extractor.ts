import { BaseExtractor } from '../base-extractor.js';
import { applyDeclaredTimePrecision, format_datetime } from './value-type-extractor-utils.js';

export class DateTimeExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valueDateTime')) {
			return format_datetime(
				applyDeclaredTimePrecision(parameter.valueDateTime, parameter._valueDateTime)
			);
		}

		return undefined;
	}
}
