const BaseExtractor = require('./BaseExtractor');

class NullEmptyExtractor extends BaseExtractor {
    _process(parameter) {
        if (!parameter.hasOwnProperty("_valueBoolean") ||
            !parameter._valueBoolean.hasOwnProperty("extension")) {
            return undefined;
        }

        for (let extension of parameter._valueBoolean.extension) {
            if (extension.hasOwnProperty("url") &&
                extension.url == "http://hl7.org/fhir/StructureDefinition/data-absent-reason" &&
                extension.hasOwnProperty("valueCode") &&
                extension.valueCode == "unknown"
            ) {
                return null;
            }

            if (extension.hasOwnProperty("url") &&
                extension.url == "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList" &&
                extension.hasOwnProperty("valueBoolean") &&
                extension.valueBoolean
            ) {
                return [ ];
            }

            if (extension.hasOwnProperty("url") &&
                extension.url == "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyTuple" &&
                extension.hasOwnProperty("valueBoolean") &&
                extension.valueBoolean
            ) {
                return { };
            }
        }

        return undefined;
    }
}

module.exports = NullEmptyExtractor;

// {
//     "resourceType": "Parameters",
//     "parameter": [
//         {
//             "name": "return",
//             "_valueBoolean": {
//                 "extension": [
//                     {
//                         "url": "http://hl7.org/fhir/StructureDefinition/cqf-isEmptyList",
//                         "valueBoolean": true
//                     }
//                 ]
//             }
//         }
//     ]
// }