const ValueMap = require('./ValueMap');

class ResultExtractor {
    #extractors = null

    constructor(extractors) {
        this.#extractors = extractors;
    }

    _extractValues(parameters) {
        let values = new ValueMap();
        for (let parameter of parameters) {
            values.add(
                parameter.name,
                parameter.hasOwnProperty('part')
                    ? this._extractValues(parameter.part)
                    : this.#extractors.extractValue(parameter)
            )
        }
        return values;
    }

    extract(response) {
        if (!response.hasOwnProperty('resourceType') || !response.resourceType === 'Parameters')
            // Anything that can't be structured directly, return as the actual output...
            return JSON.stringify(response);

        if (!response.hasOwnProperty('parameter'))
            return 'undefined';

        let extracted_values = this._extractValues(response.parameter);
        return extracted_values.toResult();
   }
}

module.exports = ResultExtractor;