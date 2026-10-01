import { BaseExtractor } from '../base-extractor.js';
import {
	applyDeclaredHasOffset,
	applyDeclaredTimePrecision,
	format_datetime,
} from './value-type-extractor-utils.js';

export class DateTimeExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valueDateTime')) {
			const element = parameter._valueDateTime;
			return format_datetime(
				applyDeclaredHasOffset(
					applyDeclaredTimePrecision(parameter.valueDateTime, element),
					element
				)
			);
		}

		return undefined;
	}
}
