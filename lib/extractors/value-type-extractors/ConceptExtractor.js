const BaseExtractor = require('../BaseExtractor');

class ConceptExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("valueCodeableConcept") ||
            !parameter.valueCodeableConcept.hasOwnProperty("coding"))
            return null

        let codes = []
        for (let coding of parameter.valueCodeableConcept.coding) {
            let values = this._extractPropertyValues(coding, ['code','display','system','version'], true);
            if (values)
                codes.push(`{${values.join(',')}}`)
        }
        return `{coding:{${codes.join(',')}}}`;
    }
}

module.exports = ConceptExtractor;