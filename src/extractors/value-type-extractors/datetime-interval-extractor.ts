import { BaseExtractor } from '../base-extractor.js';
import { format_datetime, format_time } from './value-type-extractor-utils.js';

const CQL_TYPE_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';
const TIME_INTERVAL_TYPE = /^Interval<(?:System\.)?Time>$/;

/**
 * True when the parameter's cqf-cqlType extension declares `Interval<System.Time>`
 * (the `System.` prefix is optional). FHIR Period cannot hold times, so a time
 * interval arrives with its boundaries anchored to a placeholder date and only the
 * extension identifies the real point type.
 */
function isTimeInterval(parameter: any): boolean {
	if (!Array.isArray(parameter.extension)) {
		return false;
	}
	const extension = parameter.extension.find(
		(e: any) => e !== null && typeof e === 'object' && e.url === CQL_TYPE_URL
	);
	return (
		extension !== undefined &&
		typeof extension.valueString === 'string' &&
		TIME_INTERVAL_TYPE.test(extension.valueString)
	);
}

export class DateTimeIntervalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valuePeriod')) {
			const format = isTimeInterval(parameter) ? format_time : format_datetime;
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
