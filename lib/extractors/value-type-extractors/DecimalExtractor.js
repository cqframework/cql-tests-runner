const BaseExtractor = require('../BaseExtractor');

class DecimalExtractor extends BaseExtractor {
    _process(parameter) {
        // TODO: Support the precision extension to preserve precision
        return parameter.hasOwnProperty("valueDecimal")
            ? parameter.valueDecimal
            : undefined;
    }
}

module.exports = DecimalExtractor;