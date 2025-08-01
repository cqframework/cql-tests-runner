const BaseExtractor = require('../BaseExtractor');
const datetime_format = require('./ValueTypeExtractorUtils');

class PeriodExtractor extends BaseExtractor {
    _process(parameter) {
        return (parameter.hasOwnProperty("valuePeriod"))
            ? `Interval[${datetime_format(parameter.valuePeriod.start)},${datetime_format(parameter.valuePeriod.end)}}]`
            : null;
    }
}

module.exports = PeriodExtractor;