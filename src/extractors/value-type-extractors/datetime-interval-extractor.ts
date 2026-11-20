import { BaseExtractor } from '../base-extractor.js';
import { declaredCqlType } from '../../shared/interval-utils.js';
import {
	applyDeclaredTimePrecision,
	format_date,
	format_datetime,
	format_time,
} from './value-type-extractor-utils.js';

const TEMPORAL_INTERVAL_TYPE = /^Interval<(?:System\.)?(Date|DateTime|Time)>$/;
const LIST_TYPE = /^List<(.+)>$/;

/**
 * The point type declared by a cqf-cqlType extension (on the parameter or the Period), when
 * it names a temporal interval or a list of temporal intervals (the `System.` prefix is
 * optional).
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
			const period = parameter.valuePeriod;
			// The point type is read from the parameter, as in the Using CQL with FHIR examples,
			// or else from the Period itself: an engine's FHIR type converter returns only the
			// value, so that is where it can mark one (as the Java engine marks a numeric Range).
			const format =
				BOUNDARY_FORMATS[
					declaredPointType(parameter) ?? declaredPointType(period) ?? 'DateTime'
				];
			// Period boundaries are FHIR dateTimes, so a boundary coarser than seconds arrives
			// zero-padded with its real precision on the `_start`/`_end` companion element.
			const low = period.hasOwnProperty('start')
				? format(applyDeclaredTimePrecision(period.start, period._start))
				: null;
			const high = period.hasOwnProperty('end')
				? format(applyDeclaredTimePrecision(period.end, period._end))
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
