const BaseExtractor = require('../BaseExtractor');

class DateExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueDate") ? `@${parameter.valueDate}` : undefined;
    }
}

module.exports = DateExtractor;