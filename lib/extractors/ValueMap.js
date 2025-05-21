class ValueMap {
    static NON_NAMED_KEYWORDS = ['return', 'element', 'evaluation error'];
    #map = new Map();

    add(key, value){
        if (!this.#map.has(key))
            this.#map.set(key, [value]);
        else 
            this.#map.get(key).push(value);
    }

    _collapse() {
        let collapsed_map = new Map();
        for(let [key, value] of this.#map) {
            if (value.length == 1)
                collapsed_map.set(key, value.toString());
            else if (value.length > 1)
                collapsed_map.set(key, `{${value.join(',')}}`);
        }
        return collapsed_map;
    }

    get size() {
        return this.#map.size;
    }

    toString() {
        if (this.#map.size == 0)
            return '';

        let collapsed_map = this._collapse();
        if (collapsed_map.size == 1) {
            let keys = Array.from(collapsed_map.keys());
            let values = Array.from(collapsed_map.values());
            return (ValueMap.NON_NAMED_KEYWORDS.includes(keys[0]))
                   ? values[0]
                   : `{${keys[0]}}:${values[0]}`;
        }

        let result = []
        for (let [key, value] of collapsed_map){
            result.push(`${key}:${value}`);
        }
        return `{${result.join(',')}}`;
    }
}

module.exports = ValueMap;