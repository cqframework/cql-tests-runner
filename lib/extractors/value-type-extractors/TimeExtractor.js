const BaseExtractor = require('../BaseExtractor');

class TimeExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueTime")
            ? `@T${parameter.valueTime.toString()}`
            : undefined;
    }
}

module.exports = TimeExtractor;