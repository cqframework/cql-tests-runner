import { BaseExtractor } from '../base-extractor.js';
import { format_date, format_datetime, format_time } from './value-type-extractor-utils.js';

const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';
const TEMPORAL_INTERVAL_TYPE = /^Interval<(?:System\.)?(Date|DateTime|Time)>$/;

/**
 * The point type declared by the parameter's cqf-cqlType extension, when it names a
 * temporal interval (the `System.` prefix is optional). FHIR Period boundaries are
 * always dateTimes — a time interval arrives anchored to a placeholder date, and a
 * date interval may pick up a time part — so only the extension identifies the real
 * point type.
 */
function declaredPointType(parameter: any): 'Date' | 'DateTime' | 'Time' | undefined {
	if (!Array.isArray(parameter.extension)) {
		return undefined;
	}
	const extension = parameter.extension.find(
		(e: any) => e !== null && typeof e === 'object' && e.url === CQL_TYPE_URL
	);
	if (extension === undefined || typeof extension.valueString !== 'string') {
		return undefined;
	}
	const match = TEMPORAL_INTERVAL_TYPE.exec(extension.valueString);
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
