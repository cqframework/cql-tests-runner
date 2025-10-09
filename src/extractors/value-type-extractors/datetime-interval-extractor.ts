import { BaseExtractor } from '../base-extractor.js';
import { format_datetime } from './value-type-extractor-utils.js';

export class DateTimeIntervalExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    // TODO: Use the cqlType extension to establish the point type of the interval
    if (parameter.hasOwnProperty("valuePeriod")) {
      const low = parameter.valuePeriod.hasOwnProperty("start") ? format_datetime(parameter.valuePeriod.start) : null;
      const high = parameter.valuePeriod.hasOwnProperty("end") ? format_datetime(parameter.valuePeriod.end) : null;
      return {
        lowClosed: low !== null,
        low: low,
        highClosed: true,
        high: high
      };
    }

    return undefined;
  }
}
