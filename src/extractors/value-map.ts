export class ValueMap {
	static NON_NAMED_KEYWORDS = ['return', 'element', 'evaluation error'];
	private map = new Map<string, any[]>();

	/**
	 * Builds the key set for {@link ValueMap}'s `singletonListKeys` from a parsed CQL
	 * expected outcome (from `cvl.parse`), so FHIR list encoding matches expected List-typed expectations.
	 * For: https://github.com/cqframework/cql-tests-runner/issues/82
	 */
	static singletonListKeysFromExpected(parsed: unknown): ReadonlySet<string> {
		const keys = new Set<string>();
		if (!Array.isArray(parsed)) {
			return keys;
		}
		// Empty list `{}` parses to `[]`. Do not mark `return` as singleton-list: the
		// extractor already yields `[]` for FHIR empty-list encoding; wrapping would
		// produce `[[]]` vs expected `[]` (see cqframework/cql-tests-runner#90).
		if (parsed.length === 0) {
			return keys;
		}
		keys.add('return');
		for (const item of parsed) {
			if (Array.isArray(item)) {
				keys.add('element');
			}
		}
		return keys;
	}

	/**
	 * @param singletonListKeys — parameter names for which a single collected value
	 *   stays wrapped as a one-element array (matches CQL list vs scalar distinction
	 *   when the test expectation is a list shape).
	 */
	constructor(private readonly singletonListKeys: ReadonlySet<string> = new Set()) {}

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
				if (this.singletonListKeys.has(key)) {
					collapsed_map.set(key, [...value]);
				} else {
					collapsed_map.set(key, value[0]);
				}
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
