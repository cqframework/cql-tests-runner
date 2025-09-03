const BaseExtractor = require('../BaseExtractor');

class BooleanExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueBoolean") 
               ? parameter.valueBoolean
               : undefined;
    }
}

module.exports = BooleanExtractor;