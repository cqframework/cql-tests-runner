const BaseExtractor = require('../BaseExtractor');
const datetime_format = require('./ValueTypeExtractorUtils');

class DateTimeExtractor extends BaseExtractor {
    _process(parameter) {
        // TODO: Support the dateTimePrecision extension to preserve precision
        if (parameter.hasOwnProperty("valueDateTime")) {
            return datetime_format(parameter.valueDateTime);
        }

        return undefined;
    }
}

module.exports = DateTimeExtractor;