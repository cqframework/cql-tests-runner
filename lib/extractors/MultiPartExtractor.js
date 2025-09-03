// $CQL parameters all use the 'return' name, this is an indication working with a $CQL response
// $CQL works with a single expression at a time
// Library/$evaluate has the define name and the returned parameter name... name != 'return then Library/$evaluate response
// Library/$evaluate returns all defines in a library
//   therefore the parameter list contains all the values for every define statement

// $CQL Single value : 1
// {
//     "resourceType": "Parameters",
//     "parameter": [  <------------------- Only a single value in the array
//         {
//             "name": "return",
//             "valueInteger": 1
//         }
//     ]
// }

// $CQL Tuple : { name: 'Patrick', birthDate: @2014-01-01 }
// {
//     "resourceType": "Parameters",
//     "parameter": [
//         {
//             "name": "return",
//             "part": [  <------------------- part property indicates this is a tuple
//                 {
//                     "name": "name",  <------------------- name of tuple property
//                     "valueString": "Patrick"
//                 },
//                 {
//                     "name": "birthDate",  <------------------- name of tuple property
//                     "valueDate": "2014-01-01"
//                 }
//             ]
//         }
//     ]
// }

// $CQL Tuple with List : { name: 'Patrick', birthDate: @2014-01-01, address: { '123 Main St', '789 Beach Front Rd' } }
// {
//     "resourceType": "Parameters",
//     "parameter": [
//         {
//             "name": "return",
//             "part": [  <------------------- part property indicates this is a tuple
//                 {
//                     "name": "name",  <------------------- name of tuple property
//                     "valueString": "Patrick"
//                 },
//                 {
//                     "name": "birthDate",  <------------------- name of tuple property
//                     "valueDate": "2014-01-01"
//                 },
//                 {
//                     "name": "address",  <------------------- name of tuple property
//                     "valueString": "123 Main St"
//                 },
//                 {
//                     "name": "address",  <------------------- name of tuple property, property name is repeated meaning this is an array
//                     "valueString": "789 Beach Front Rd"
//                 }
//             ]
//         }
//     ]
// }

// $CQL List : { 1, 2, 3 }
// {
//     "resourceType": "Parameters",
//     "parameter": [  <------------------- More than one parameter, indicates this a list
//         {
//             "name": "return",
//             "valueInteger": 1
//         },
//         {
//             "name": "return",
//             "valueInteger": 2
//         },
//         {
//             "name": "return",
//             "valueInteger": 3
//         }
//     ]
// }

// $CQL Nested List : { { 1, 2, 3 }, { 4, 5, 6 } }
// {
//     "resourceType": "Parameters",
//     "parameter": [  <------------------- More than one parameter, indicates this a list
//         {
//             "name": "return",
//             "part": [  <------------------- part property indicates this is a tuple
//                 {
//                     "name": "element",
//                     "valueInteger": 1
//                 },
//                 {
//                     "name": "element",
//                     "valueInteger": 2
//                 },
//                 {
//                     "name": "element",
//                     "valueInteger": 3
//                 }
//             ]
//         },
//         {
//             "name": "return",
//             "part": [
//                 {
//                     "name": "element",
//                     "valueInteger": 4
//                 },
//                 {
//                     "name": "element",
//                     "valueInteger": 5
//                 },
//                 {
//                     "name": "element",
//                     "valueInteger": 6
//                 }
//             ]
//         }
//     ]
// }

// Library/$evaluate - Tuple
// define get_tuple:
//   { name: 'Patrick', birthDate: @2014-01-01 }
// {
//     "name": "get_tuple",  <-- define name
//     "part": [  <------------------- part property indicates this is a tuple
//         {
//             "name": "a",
//             "valueInteger": 1
//         },
//         {
//             "name": "b",
//             "valueInteger": 2
//         }
//     ]
// }

// Library/$evaluate - List of Integers 
//    define get_list_of_integer:
//      return { 1, 2, 3 }
// {
//     "resourceType": "Parameters",
//     "parameter": [
//         {
//             "name": "get_list_of_integer",  <-- this is the name of the define statement
//             "valueInteger": 1
//         },
//         {
//             "name": "get_list_of_integer",  <-- define name is repeated, this an element in the same array
//             "valueInteger": 2
//         },
//         {
//             "name": "get_list_of_integer",  <-- define name is repeated, this an element in the same array
//             "valueInteger": 3
//         }
//     ]
// }
const ValueMap = require('./ValueMap');

class MultiPartExtractor {
    #valueTypeHandler = undefined

    constructor(valueTypeHandler) {
        this.#valueTypeHandler = valueTypeHandler;
    }

    extractValues(parameters) {
        let values = new ValueMap();
        for (let parameter of parameters) {
            values.add(
                parameter.name,
                (parameter.hasOwnProperty('part')) 
                ? this.extractValues(parameter.part)
                : this.#valueTypeHandler.extractValue(parameter)
            )
        }
        return values;
    }
}

module.exports = MultiPartExtractor;