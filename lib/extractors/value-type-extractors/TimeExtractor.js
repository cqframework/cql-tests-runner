const BaseExtractor = require('../BaseExtractor');

class TimeExtractor extends BaseExtractor {
    _process(parameter) {
        return parameter.hasOwnProperty("valueTime")
            ? `@T${parameter.valueTime.toString()}`
            : null;
    }
}

module.exports = TimeExtractor;