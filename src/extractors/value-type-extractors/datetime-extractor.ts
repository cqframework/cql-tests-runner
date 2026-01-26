import { BaseExtractor } from '../base-extractor.js';
import { format_datetime } from './value-type-extractor-utils.js';

export class DateTimeExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		// TODO: Support the dateTimePrecision extension to preserve precision
		if (parameter.hasOwnProperty('valueDateTime')) {
			return format_datetime(parameter.valueDateTime);
		}

		return undefined;
	}
}
