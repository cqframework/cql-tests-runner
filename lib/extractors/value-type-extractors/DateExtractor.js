const BaseExtractor = require('../BaseExtractor');

class DateExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueDate") ? `@${parameter.valueDate.toString()}` : null;
    }
}

module.exports = DateExtractor;