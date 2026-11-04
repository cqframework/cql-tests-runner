/**
 * A parsed `cqf-cqlType` value, such as `System.Integer`, `List<Interval<System.Date>>` or
 * `Tuple<a System.Integer, b List<System.String>>`. `fields` is set for a Tuple, `args` for
 * any other generic type (List, Interval, Choice).
 */
export type CqlType = {
	name: string;
	args: CqlType[];
	fields?: Map<string, CqlType>;
};

/**
 * Parses a `cqf-cqlType` string. Returns `undefined` for anything it doesn't recognise, so
 * a caller treats an unreadable type the same as an undeclared one.
 */
export function parseCqlType(text: string): CqlType | undefined {
	let position = 0;

	const skipSpaces = () => {
		while (position < text.length && text[position] === ' ') position++;
	};
	const identifier = (): string | undefined => {
		const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(text.slice(position));
		if (match === null) return undefined;
		position += match[0].length;
		return match[0];
	};
	const expect = (character: string): boolean => {
		skipSpaces();
		if (text[position] !== character) return false;
		position++;
		return true;
	};

	const parseType = (): CqlType | undefined => {
		skipSpaces();
		const name = identifier();
		if (name === undefined) return undefined;
		skipSpaces();
		if (text[position] !== '<') return { name: name, args: [] };
		position++;

		if (name === 'Tuple') {
			const fields = new Map<string, CqlType>();
			do {
				skipSpaces();
				const field = identifier();
				if (field === undefined) return undefined;
				const type = parseType();
				if (type === undefined) return undefined;
				fields.set(field, type);
			} while (expect(','));
			return expect('>') ? { name: name, args: [], fields: fields } : undefined;
		}

		const args: CqlType[] = [];
		do {
			const arg = parseType();
			if (arg === undefined) return undefined;
			args.push(arg);
		} while (expect(','));
		return expect('>') ? { name: name, args: args } : undefined;
	};

	const type = parseType();
	skipSpaces();
	return type !== undefined && position === text.length ? type : undefined;
}

/** The element type of a `List<T>`, or `undefined` when `type` isn't a List. */
export function listElementType(type: CqlType | undefined): CqlType | undefined {
	return type?.name === 'List' && type.args.length === 1 ? type.args[0] : undefined;
}
