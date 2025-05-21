function format_datetime(datetime, ignore_timezone=false) {
    let dt = `@${datetime.toString()}`;
    if (dt.length <= 11) {
        // append a 'T' to indicate this is a DateTime literal
        dt = `${dt}T`;
    }
    return ignore_timezone ? remove_timezone(dt) : dt;
}

function remove_timezone(timestamp) {
    let trimmed_timestamp = /^@(?:[\d]{4}(?:-[\d]{2}-(?:[\d]{2})?)?)?T(?:[\d]{2}:[\d]{2}:[\d]{2})?(?:\.[\d]{3})?/.exec(timestamp);
    return trimmed_timestamp ? trimmed_timestamp[0] : timestamp;
}

module.exports = format_datetime;