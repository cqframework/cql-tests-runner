const BaseExtractor = require('./BaseExtractor');

class EvaluationErrorExtractor extends BaseExtractor {
    _process(parameter) {
        if (parameter.name != 'evaluation error')
            return null;
        return `EvaluationError:${parameter.resource.issue[0].details.text}`;
    }
}

module.exports = EvaluationErrorExtractor;