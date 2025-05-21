const BaseExtractor = require('../BaseExtractor');

class StringExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueString") 
               ? `'${parameter.valueString.replaceAll("'", "\\'")}'` 
               : null;
    }
}

module.exports = StringExtractor;