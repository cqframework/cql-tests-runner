const BaseExtractor = require('../BaseExtractor');
const datetime_format = require('./ValueTypeExtractorUtils');

class DateTimeIntervalExtractor extends BaseExtractor {
    _process(parameter) {
        // TODO: Use the cqlType extension to establish the point type of the interval
        if (parameter.hasOwnProperty("valuePeriod")) {
            let low = parameter.valuePeriod.hasOwnProperty("start") ? datetime_format(parameter.valuePeriod.start) : null;
            let high = parameter.valuePeriod.hasOwnProperty("end") ? datetime_format(parameter.valuePeriod.end) : null;
            return {
                lowClosed: low !== null,
                low: low,
                highClosed: true,
                high: high
            }
        }

        return undefined;
    }
}

module.exports = DateTimeIntervalExtractor;