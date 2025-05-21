const BaseExtractor = require('../BaseExtractor');
const datetime_format = require('./ValueTypeExtractorUtils');

class PeriodExtractor extends BaseExtractor {
    #ignore_timezone = null;

    constructor(ignore_timezone=false) {
        super();
        this.#ignore_timezone = ignore_timezone
    }

    _process(parameter) {
        return (parameter.hasOwnProperty("valuePeriod"))
            ? `Interval[${datetime_format(parameter.valuePeriod.start, this.#ignore_timezone)},${datetime_format(parameter.valuePeriod.end, this.#ignore_timezone)}}]`
            : null;
    }
}

module.exports = PeriodExtractor;