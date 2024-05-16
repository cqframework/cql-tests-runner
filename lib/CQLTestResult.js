class CQLTestResult {
    testStatus; // String: pass | fail | skip | error
    responseStatus; // Integer
    actual; // String
    expected; // String
    error; // Error
    testsName;
    groupName;
    testName;
    invalid;
    expression;
    test;

    constructor(testStatus){
        if(testStatus){
            this.testStatus = testStatus;
        }
    }

    static compute(response) {
        if (response?.resourceType !== 'Parameters') {
            return JSON.stringify(response); // Return JSON string representation if resourceType is not 'Parameters'
        }

        const returnValue = response.parameter.find(p => p.name === 'return');

        if (!returnValue) {
            return undefined; // No 'return' parameter found
        }

        const valueTypes = ['valueBoolean', 'valueInteger', 'valueString', 'valueDecimal', 'valueDate', 'valueDateTime', 'valueTime', 'valueQuantity'];
        for (const valueType of valueTypes) {
            if (typeof returnValue?.[valueType] === 'boolean' || returnValue?.[valueType]) {
                if (valueType === 'valueQuantity') {
                    const { value, code } = returnValue[valueType];
                    return `${value.toString()} '${code}'`;
                } else {
                    return returnValue[valueType].toString(); // Convert value to string
                }
            }
        }

        // If none of the expected value types are found, return undefined
        return undefined;
    }
}

module.exports = CQLTestResult;