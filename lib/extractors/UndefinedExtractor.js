const BaseExtractor = require('./BaseExtractor');

class UndefinedExtractor extends BaseExtractor {
    _process(parameter) {
        if (parameter.hasOwnProperty("name") && parameter.name == 'return' && Object.keys(parameter).length == 1)
            return 'undefined'

        return null;
    }
}

module.exports = UndefinedExtractor;