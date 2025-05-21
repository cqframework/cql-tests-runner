const BaseExtractor = require('../BaseExtractor');

class BooleanExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueBoolean") 
               ? parameter.valueBoolean.toString()
               : null;
    }
}

module.exports = BooleanExtractor;