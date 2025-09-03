const BaseExtractor = require('../BaseExtractor');

class StringExtractor extends BaseExtractor {
    _process(parameter) {
        if (parameter.hasOwnProperty("valueString")) {
            return parameter.valueString;
        }

        return undefined;
    }
}

module.exports = StringExtractor;