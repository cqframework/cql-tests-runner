import { BaseExtractor } from '../base-extractor.js';
import { declaredCqlType } from '../../shared/interval-utils.js';
import { format_date, format_datetime, format_time } from './value-type-extractor-utils.js';

const TEMPORAL_INTERVAL_TYPE = /^Interval<(?:System\.)?(Date|DateTime|Time)>$/;

/**
 * The point type declared by the parameter's cqf-cqlType extension, when it names a
 * temporal interval (the `System.` prefix is optional). FHIR Period boundaries are
 * always dateTimes — a time interval arrives anchored to a placeholder date, and a
 * date interval may pick up a time part — so only the extension identifies the real
 * point type.
 */
function declaredPointType(parameter: any): 'Date' | 'DateTime' | 'Time' | undefined {
	const typeString = declaredCqlType(parameter);
	if (typeString === undefined) {
		return undefined;
	}
	const match = TEMPORAL_INTERVAL_TYPE.exec(typeString);
	return match === null ? undefined : (match[1] as 'Date' | 'DateTime' | 'Time');
}

const BOUNDARY_FORMATS = {
	Date: format_date,
	DateTime: format_datetime,
	Time: format_time,
};

export class DateTimeIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (!parameter.hasOwnProperty('valuePeriod')) {
			return undefined;
		}

		const period = parameter.valuePeriod;
		if (period === null || typeof period !== 'object') {
			return undefined;
		}

		// With no cqf-cqlType the point type cannot be recovered: a Period boundary of
		// `2012-01-01T00:00:00-07:00` is indistinguishable from a DateTime interval that starts at
		// midnight. The IG requires the extension on every CQL-valued result and says a value
		// without it is the FHIR type, so an undeclared Period is read as Interval<DateTime>.
		const format = BOUNDARY_FORMATS[declaredPointType(parameter) ?? 'DateTime'];
		const low = period.hasOwnProperty('start') ? format(period.start) : null;
		const high = period.hasOwnProperty('end') ? format(period.end) : null;

		return {
			lowClosed: low !== null,
			low: low,
			// An absent boundary is unbounded, so it is not closed. Matching
			// NumericIntervalExtractor keeps `Interval[x, null)` comparable either way it arrives.
			highClosed: high !== null,
			high: high,
		};
	}
}
