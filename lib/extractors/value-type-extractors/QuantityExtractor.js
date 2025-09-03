const BaseExtractor = require('../BaseExtractor');

class QuantityExtractor extends BaseExtractor {
    _process(parameter) {
        // TODO: Use the precision extension (see DecimalExtractor)
        if (parameter.hasOwnProperty("valueQuantity") && parameter.valueQuantity.hasOwnProperty("value")) {
            return {
                value: parameter.valueQuantity.value,
                unit: parameter.valueQuantity.hasOwnProperty("code") 
                    ? parameter.valueQuantity.code
                    : null
            }
        }

        return undefined;
    }
}

module.exports = QuantityExtractor;