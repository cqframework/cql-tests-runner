const BaseExtractor = require('../BaseExtractor');

class RatioExtractor extends BaseExtractor {


    _process(parameter) {
        function getRatioValue(ratio_element) {
            let value = ratio_element.value;
            return (ratio_element.unit == 1)
                ? `{value:${value}}`
                : `{value:${value},unit:'${ratio_element.unit}'}`;

        }

        if (!parameter.hasOwnProperty("valueRatio"))
            return null;

        return "{" +
                 `numerator:${getRatioValue(parameter.valueRatio.numerator)},` +
                 `denominator:${getRatioValue(parameter.valueRatio.denominator)}` +
               "}";
    }
}

module.exports = RatioExtractor;