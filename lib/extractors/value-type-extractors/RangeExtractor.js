const BaseExtractor = require('../BaseExtractor');

class RangeExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("valueRange"))
            return null;

        if (parameter.valueRange.low.hasOwnProperty('unit')){
            // quantity range
            // TODO handle quantities without units
            let low = `${parameter.valueRange.low.value}'${parameter.valueRange.low.unit}'`;
            let high = `${parameter.valueRange.high.value}'${parameter.valueRange.high.unit}'`;
            return `Interval[${low},${high}]`;
        }

        return null;
    }
}

module.exports = RangeExtractor;
