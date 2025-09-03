const BaseExtractor = require('../BaseExtractor');

class QuantityIntervalExtractor extends BaseExtractor {
    _process(parameter) {
        function getQuantity(value) {
            if (value.hasOwnProperty("value")) {
                return {
                    value: value.value,
                    unit: value.hasOwnProperty("code") ? value.code : null
                }
            }
            
            return null;
        }

        if (parameter.hasOwnProperty("valueRange")) {
            let low = parameter.valueRange.hasOwnProperty("low")
                ? getQuantity(parameter.valueRange.low)
                : null;

            let high = parameter.valueRange.hasOwnProperty("high")
                ? getQuantity(parameter.valueRange.high)
                : null;

            return {
                lowClosed: low !== null,
                low: low,
                highClosed: high !== null,
                high: high
            }
        }

        return undefined;
    }
}

module.exports = QuantityIntervalExtractor;
