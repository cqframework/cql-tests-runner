const UNESCAPE_MAP = new Map([
	['\\"', '"'],
	["\\'", "'"],
	['\\`', '`'],
	['\\\\', '\\'],
	['\\/', '/'],
	['\\f', '\f'],
	['\\n', '\n'],
	['\\r', '\r'],
	['\\t', '\t'],
	// Unicode escapes handled separately
]);

// Longer escape sequences should be matched first to avoid partial matches
const MULTI_CHAR_UNESCAPE = [...UNESCAPE_MAP.keys()].toSorted((a, b) => b.length - a.length);

const UNESCAPE_REGEX = new RegExp(
	MULTI_CHAR_UNESCAPE.map(RegExp.escape).join('|') + '|\\\\u[0-9a-fA-F]{4}',
	'g'
);

const HEX_RADIX = 16;

/**
 * Unescapes STRING content as per the CVL grammar. Based on CQL's [unescapeCql](https://github.com/cqframework/clinical_quality_language/blob/master/Src/java/cql-to-elm/src/commonMain/kotlin/org/cqframework/cql/cql2elm/StringEscapeUtils.kt#L68).
 *
 * @param {string} input
 * @returns {string}
 */
export function unescapeString(input) {
	return input.replace(UNESCAPE_REGEX, match => {
		if (UNESCAPE_MAP.has(match)) {
			return UNESCAPE_MAP.get(match);
		}
		if (match.startsWith('\\u')) {
			const hex = match.slice(2);
			return String.fromCharCode(parseInt(hex, HEX_RADIX));
		}
		throw new Error(`Invalid escape sequence: ${match}`);
	});
}
