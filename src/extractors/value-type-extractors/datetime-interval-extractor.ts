import { BaseExtractor } from '../base-extractor.js';
import { declaredCqlType } from '../../shared/interval-utils.js';
import { format_date, format_datetime, format_time } from './value-type-extractor-utils.js';

const TEMPORAL_INTERVAL_TYPE = /^Interval<(?:System\.)?(Date|DateTime|Time)>$/;
const LIST_TYPE = /^List<(.+)>$/;

/**
 * The point type declared by the parameter's cqf-cqlType extension, when it names a
 * temporal interval or a list of temporal intervals (the `System.` prefix is optional).
 * Only one direct `List` wrapper is unwrapped; nested lists are not interval elements at
 * this level. FHIR Period boundaries are always dateTimes — a time interval arrives
 * anchored to a placeholder date, and a date interval may pick up a time part — so only
 * the extension identifies the real point type.
 */
function declaredPointType(parameter: any): 'Date' | 'DateTime' | 'Time' | undefined {
	const typeString = declaredCqlType(parameter);
	if (typeString === undefined) {
		return undefined;
	}
	const listMatch = LIST_TYPE.exec(typeString);
	const intervalType = listMatch === null ? typeString : listMatch[1];
	const match = TEMPORAL_INTERVAL_TYPE.exec(intervalType);
	return match === null ? undefined : (match[1] as 'Date' | 'DateTime' | 'Time');
}

const BOUNDARY_FORMATS = {
	Date: format_date,
	DateTime: format_datetime,
	Time: format_time,
};

export class DateTimeIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valuePeriod')) {
			const format = BOUNDARY_FORMATS[declaredPointType(parameter) ?? 'DateTime'];
			const low = parameter.valuePeriod.hasOwnProperty('start')
				? format(parameter.valuePeriod.start)
				: null;
			const high = parameter.valuePeriod.hasOwnProperty('end')
				? format(parameter.valuePeriod.end)
				: null;
			return {
				lowClosed: low !== null,
				low: low,
				highClosed: true,
				high: high,
			};
		}

		return undefined;
	}
}
