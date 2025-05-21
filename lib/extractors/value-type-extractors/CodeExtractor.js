const BaseExtractor = require('../BaseExtractor');

class CodeExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("valueCoding"))
            return null;

        let values = this._extractPropertyValues(parameter.valueCoding, ['code','display','system','version'], true);
        return `{${values.join(',')}}`
    }
}

module.exports = CodeExtractor;