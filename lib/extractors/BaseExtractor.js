class BaseExtractor {
    #nextExtractor = undefined

    constructor() {
        this.#nextExtractor = null;
    }

    setNextExtractor(handler) {
        this.#nextExtractor = handler;
        return handler;
    }

    extractValue(parameter) {
        let result = this._process(parameter)
        if (result !== undefined)
            return result;
        else if (this.#nextExtractor)
            return this.#nextExtractor.extractValue(parameter);
        else
            return undefined;
    }

    /*
    _extractPropertyValue(parameter, property_name, return_property_name = false) {
        if (!parameter.hasOwnProperty(property_name))
            return null;

        return (return_property_name)
               ? `${property_name}:'${parameter[property_name]}'`
               : parameter[property_name]
    }

    _extractPropertyValues(parameter, property_names, return_property_name = false) {
        let values = [];
        for(let property_name of property_names) {
            let property_value = this._extractPropertyValue(parameter, property_name, return_property_name);
            if (property_value)
                values.push(property_value)
        }
        return values;
    }
    */
   
    _process(parameter) {
        throw new Error("Method '_process' must be implemented.");
    }
}

module.exports = BaseExtractor;