export class ValueMap {
	static NON_NAMED_KEYWORDS = ['return', 'element', 'evaluation error'];
	private map = new Map<string, any[]>();

	add(key: string, value: any): void {
		if (!this.map.has(key)) {
			this.map.set(key, [value]);
		} else {
			this.map.get(key)!.push(value);
		}
	}

	private _collapse(): Map<string, any> {
		const collapsed_map = new Map<string, any>();
		for (const [key, value] of this.map) {
			if (value.length === 1) {
				collapsed_map.set(key, value[0]);
			} else if (value.length > 1) {
				collapsed_map.set(key, value);
			}
		}
		return collapsed_map;
	}

	get size(): number {
		return this.map.size;
	}

	toResult(): any {
		if (this.map.size === 0) {
			return undefined;
		}

		const collapsed_map = this._collapse();
		if (collapsed_map.size === 1) {
			const value = Array.from(collapsed_map.values())[0];
			return value instanceof ValueMap ? value.toResult() : value;
		}

		const result: Record<string, any> = {};
		for (const [key, value] of collapsed_map) {
			result[key] = value instanceof ValueMap ? value.toResult() : value;
		}
		return result;
	}
}
