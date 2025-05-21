const BaseExtractor = require('../BaseExtractor');
const datetime_format = require('./ValueTypeExtractorUtils');

class DateTimeExtractor extends BaseExtractor {
    #ignore_timezone = null;

    constructor(ignore_timezone=false) {
        super();
        this.#ignore_timezone = ignore_timezone
    }

    _process(parameter) {
        if (!parameter.hasOwnProperty("valueDateTime"))
            return null

        // let dt = `@${parameter.valueDateTime.toString()}`;
        // if (dt.length <= 11) {
        //     // parameter only returned the date portion of the datetime
        //     // append a 'T' to indicate this is a DateTime literal
        //     dt = `${dt}T`;
        // }
        return datetime_format(parameter.valueDateTime.toString(), this.#ignore_timezone);
    }
}

module.exports = DateTimeExtractor;