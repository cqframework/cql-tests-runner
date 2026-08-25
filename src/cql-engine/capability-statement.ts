/**
 * Reads what a server's CapabilityStatement can tell us about the CQL implementation under test.
 *
 * Two very different things come out of a CapabilityStatement, and it is worth keeping them apart:
 *
 * - **Operation support** is declared by base FHIR and is reliable. A server lists the system-level
 *   `$cql` operation and the `Library` `$evaluate` operation, so the configured `CqlOperation` can
 *   be checked before a run instead of failing test by test.
 * - **Versions are not standardised.** A CapabilityStatement has no element for a CQL language,
 *   engine or translator version, and no extension for them is registered either — the HL7 SDC
 *   guidance is that a server "SHALL document their capabilities around languages and language
 *   extensions in the textual documentation" of the statement, i.e. as prose. Because there is no
 *   url to rely on, this module invents none: a deployment whose server does publish them
 *   configures the extension urls (`Build.CapabilityVersionExtensions`), and otherwise nothing is
 *   read and the configured version values stand.
 *
 * `software.name`/`software.version` are deliberately *not* treated as the CQL engine's identity:
 * they describe the FHIR server (for example "HAPI FHIR Server" 8.10.0), which is a different
 * product from the CQL engine it hosts (for example the CQF engine 4.1.0). Reporting one as the
 * other would record a wrong engine version, and — if it reached `CqlVersion` — silently change
 * which tests are version-gated. They are reported separately as server provenance instead.
 */

/**
 * The CQL implementation values a server can be asked to declare. Which extension carries each one
 * is supplied by configuration rather than assumed here — see {@link CapabilityVersionExtensions}.
 */
export const CQL_VERSION_FIELDS = [
	'cqlVersion',
	'cqlEngine',
	'cqlEngineVersion',
	'cqlTranslator',
	'cqlTranslatorVersion',
] as const;

export type CqlVersionField = (typeof CQL_VERSION_FIELDS)[number];

/**
 * Maps a CQL implementation value to the extension url a particular server publishes it under.
 *
 * There is no registered extension for any of these, so the runner does not guess at urls: a
 * deployment that has a server publishing them configures the mapping, and a deployment that does
 * not simply leaves it unset and falls back to the configured version values.
 */
export type CapabilityVersionExtensions = Partial<Record<CqlVersionField, string>>;

/** Where a reported value came from. Recorded so a report is never ambiguous about provenance. */
export type ValueSource = 'capability-statement' | 'config';

export interface ResolvedValue {
	value: string;
	source: ValueSource;
}

export interface ServerSoftware {
	name?: string;
	version?: string;
	fhirVersion?: string;
}

/** The FHIR server's own software identity — not the CQL engine's. */
export function readServerSoftware(capabilityStatement: any): ServerSoftware {
	if (capabilityStatement === null || typeof capabilityStatement !== 'object') {
		return {};
	}
	const software = capabilityStatement.software;
	return {
		name: typeof software?.name === 'string' ? software.name : undefined,
		version: typeof software?.version === 'string' ? software.version : undefined,
		fhirVersion:
			typeof capabilityStatement.fhirVersion === 'string'
				? capabilityStatement.fhirVersion
				: undefined,
	};
}

function extensionValue(extensions: any, url: string): string | undefined {
	if (!Array.isArray(extensions)) {
		return undefined;
	}
	for (const extension of extensions) {
		if (extension === null || typeof extension !== 'object') continue;
		if (extension.url !== url) continue;
		if (typeof extension.valueString === 'string' && extension.valueString.trim() !== '') {
			return extension.valueString;
		}
		if (typeof extension.valueCode === 'string' && extension.valueCode.trim() !== '') {
			return extension.valueCode;
		}
	}
	return undefined;
}

/**
 * The CQL implementation versions a server publishes under the configured extension urls, looked up
 * on the statement itself and on its `rest` entry. Fields with no configured url, or that the
 * server says nothing about, are left absent so a caller can tell "not declared" from "declared as
 * empty" and fall back rather than record a guess.
 *
 * With no configured urls this returns nothing, which is the expected result today: no extension
 * for these values is registered, and HL7's guidance is that a server describes its
 * expression-language capabilities in the statement's narrative text rather than computably.
 */
export function readCqlVersions(
	capabilityStatement: any,
	extensionUrls: CapabilityVersionExtensions = {}
): Partial<Record<CqlVersionField, string>> {
	const found: Partial<Record<CqlVersionField, string>> = {};
	if (capabilityStatement === null || typeof capabilityStatement !== 'object') {
		return found;
	}

	const restEntries = Array.isArray(capabilityStatement.rest) ? capabilityStatement.rest : [];
	const extensionSets = [
		capabilityStatement.extension,
		...restEntries.map((entry: any) => entry?.extension),
	];

	for (const field of CQL_VERSION_FIELDS) {
		const url = extensionUrls[field];
		if (url === undefined || url.trim() === '') {
			continue;
		}
		for (const extensions of extensionSets) {
			const value = extensionValue(extensions, url);
			if (value !== undefined) {
				found[field] = value;
				break;
			}
		}
	}

	return found;
}

/**
 * Prefers what the server declared, falling back to the configured value. A blank configured value
 * still yields a `config` source: it is what the run was configured with, and reporting it as
 * server-declared would be wrong.
 */
export function resolveValue(
	declared: string | undefined,
	configured: string | undefined
): ResolvedValue {
	if (declared !== undefined && declared.trim() !== '') {
		return { value: declared, source: 'capability-statement' };
	}
	return { value: configured ?? '', source: 'config' };
}

/**
 * True when the statement declares the operation the run is configured to use: `$cql` is a
 * system-level operation, `$evaluate` a `Library` operation. Returns undefined when the statement
 * declares no operations at all, which is not the same as declaring the operation missing — a
 * caller should not treat an uninformative statement as a failure.
 */
export function declaresOperation(
	capabilityStatement: any,
	cqlOperation: string
): boolean | undefined {
	if (capabilityStatement === null || typeof capabilityStatement !== 'object') {
		return undefined;
	}
	const restEntries = Array.isArray(capabilityStatement.rest) ? capabilityStatement.rest : [];

	const systemOperations: string[] = [];
	const libraryOperations: string[] = [];
	for (const entry of restEntries) {
		for (const operation of Array.isArray(entry?.operation) ? entry.operation : []) {
			if (typeof operation?.name === 'string') systemOperations.push(operation.name);
		}
		for (const resource of Array.isArray(entry?.resource) ? entry.resource : []) {
			if (resource?.type !== 'Library') continue;
			for (const operation of Array.isArray(resource.operation) ? resource.operation : []) {
				if (typeof operation?.name === 'string') libraryOperations.push(operation.name);
			}
		}
	}

	if (systemOperations.length === 0 && libraryOperations.length === 0) {
		return undefined;
	}

	// Operation names are declared without the leading `$`.
	const wanted = cqlOperation.replace(/^\$/, '');
	return wanted === 'evaluate'
		? libraryOperations.includes('evaluate')
		: systemOperations.includes(wanted);
}
