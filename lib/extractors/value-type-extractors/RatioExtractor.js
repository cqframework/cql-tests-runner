const BaseExtractor = require('../BaseExtractor');

class RatioExtractor extends BaseExtractor {

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

        if (parameter.hasOwnProperty("valueRatio")) {
            let numerator = parameter.valueRatio.hasOwnProperty("numerator")
                ? getQuantity(parameter.valueRatio.numerator)
                : null;

            let denominator = parameter.valueRatio.hasOwnProperty("denominator")
                ? getQuantity(parameter.valueRatio.denominator)
                : null;

            return {
                numerator: numerator,
                denominator: denominator
            }
        }

        return undefined;
    }
}

module.exports = RatioExtractor;