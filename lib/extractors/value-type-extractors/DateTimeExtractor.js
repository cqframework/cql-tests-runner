const BaseExtractor = require('../BaseExtractor');
const datetime_format = require('./ValueTypeExtractorUtils');

class DateTimeExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("valueDateTime"))
            return null
        return datetime_format(parameter.valueDateTime.toString());
    }
}

module.exports = DateTimeExtractor;