const BaseExtractor = require('../BaseExtractor');

class QuantityExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueQuantity") 
               ? `{value:${parameter.valueQuantity.value},unit:'${parameter.valueQuantity.code }'}`
               : null;
    }
}

module.exports = QuantityExtractor;