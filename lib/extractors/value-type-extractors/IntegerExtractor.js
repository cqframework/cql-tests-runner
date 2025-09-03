const BaseExtractor = require('../BaseExtractor');

class IntegerExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueInteger") ? parameter.valueInteger : undefined;
    }
}

module.exports = IntegerExtractor;