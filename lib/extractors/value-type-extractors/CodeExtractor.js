const BaseExtractor = require('../BaseExtractor');

class CodeExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("valueCoding"))
            return undefined;

        return {
            code: parameter.valueCoding.code,
            system: parameter.valueCoding.system,
            version: parameter.valueCoding.version,
            display: parameter.valueCoding.display
        };
    }
}

module.exports = CodeExtractor;