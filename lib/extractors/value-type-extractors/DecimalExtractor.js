const BaseExtractor = require('../BaseExtractor');
const fromExponential = require('from-exponential');

class DecimalExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueDecimal")
            ? fromExponential(parameter.valueDecimal)
            : null;
    }
}

module.exports = DecimalExtractor;