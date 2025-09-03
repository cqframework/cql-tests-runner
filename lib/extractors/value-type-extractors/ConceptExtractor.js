const BaseExtractor = require('../BaseExtractor');

class ConceptExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("valueCodeableConcept") ||
            !parameter.valueCodeableConcept.hasOwnProperty("coding"))
            return undefined

        let codes = []
        for (let coding of parameter.valueCodeableConcept.coding) {
            codes.push({
                code: coding.code,
                system: coding.system,
                version: coding.version,
                display: coding.display
            });
        }
        return {
            codes: codes,
            display: parameter.valueCodeableConcept.text
        }
    }
}

module.exports = ConceptExtractor;