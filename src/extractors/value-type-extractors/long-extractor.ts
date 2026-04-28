import { BaseExtractor } from '../base-extractor.js';

const CQL_TYPE_EXTENSION_URL = 'http://hl7.org/fhir/StructureDefinition/cqf-cqlType';

function hasCqlLongType(parameter: any): boolean {
	const extensions = Array.isArray(parameter?.extension) ? parameter.extension : [];
	return extensions.some(
		(extension: any) =>
			extension?.url === CQL_TYPE_EXTENSION_URL &&
			String(extension?.valueString ?? '').toLowerCase() === 'system.long'
	);
}

function parseLong(value: unknown): bigint | undefined {
	if (value === undefined || value === null) return undefined;

	const text = String(value).trim();
	const normalized = text.endsWith('L') || text.endsWith('l') ? text.slice(0, -1) : text;

	if (!/^[+-]?\d+$/.test(normalized)) return undefined;

	return BigInt(normalized);
}

export class LongExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.hasOwnProperty('valueInteger64')) {
			return parseLong(parameter.valueInteger64);
		}

		if (parameter.hasOwnProperty('valueString') && hasCqlLongType(parameter)) {
			return parseLong(parameter.valueString);
		}

		return undefined;
	}
}
