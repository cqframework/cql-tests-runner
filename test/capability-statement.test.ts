import { describe, it, expect } from 'vitest';
import {
	declaresOperation,
	readCqlVersions,
	readServerSoftware,
	resolveValue,
} from '../src/cql-engine/capability-statement.js';

/** A CapabilityStatement shaped like the one HAPI FHIR 8.10.0 returns. */
function hapiStatement() {
	return {
		resourceType: 'CapabilityStatement',
		fhirVersion: '4.0.1',
		software: { name: 'HAPI FHIR Server', version: '8.10.0' },
		rest: [
			{
				mode: 'server',
				operation: [
					{ name: 'cql', definition: 'http://localhost:8080/fhir/OperationDefinition/-s-cql' },
					{ name: 'reindex' },
				],
				resource: [
					{ type: 'Library', operation: [{ name: 'evaluate' }, { name: 'package' }] },
					{ type: 'Patient', operation: [{ name: 'everything' }] },
				],
			},
		],
	};
}

describe('readServerSoftware', () => {
	it('reports the FHIR server software and FHIR version', () => {
		expect(readServerSoftware(hapiStatement())).toEqual({
			name: 'HAPI FHIR Server',
			version: '8.10.0',
			fhirVersion: '4.0.1',
		});
	});

	it('is empty for a missing or malformed statement', () => {
		expect(readServerSoftware(undefined)).toEqual({});
		expect(readServerSoftware(null)).toEqual({});
		expect(readServerSoftware({})).toEqual({
			name: undefined,
			version: undefined,
			fhirVersion: undefined,
		});
	});
});

// Extension urls are supplied by configuration; these stand in for a deployment's own.
const VERSION_URL = 'http://example.org/fhir/StructureDefinition/our-cql-version';
const ENGINE_VERSION_URL = 'http://example.org/fhir/StructureDefinition/our-engine-version';

describe('readCqlVersions', () => {
	it('reads nothing when no extension urls are configured', () => {
		// The default case: the runner guesses at no urls, so an unconfigured run reads nothing
		// even from a statement that happens to carry extensions.
		const statement = {
			...hapiStatement(),
			extension: [{ url: VERSION_URL, valueString: '1.5' }],
		};
		expect(readCqlVersions(statement)).toEqual({});
		expect(readCqlVersions(statement, {})).toEqual({});
	});

	it('finds nothing in a statement that carries no such extension', () => {
		// The realistic case: HAPI publishes no CQL implementation versions.
		expect(readCqlVersions(hapiStatement(), { cqlVersion: VERSION_URL })).toEqual({});
	});

	it('never mistakes server software for the CQL engine', () => {
		const found = readCqlVersions(hapiStatement(), {
			cqlEngine: ENGINE_VERSION_URL,
			cqlEngineVersion: ENGINE_VERSION_URL,
		});
		expect(found.cqlEngineVersion).toBeUndefined();
		expect(found.cqlEngine).toBeUndefined();
	});

	it('reads versions from the configured extension urls', () => {
		const statement = {
			...hapiStatement(),
			extension: [
				{ url: VERSION_URL, valueString: '1.5' },
				{ url: ENGINE_VERSION_URL, valueString: '4.1.0' },
			],
		};
		expect(
			readCqlVersions(statement, {
				cqlVersion: VERSION_URL,
				cqlEngineVersion: ENGINE_VERSION_URL,
			})
		).toEqual({ cqlVersion: '1.5', cqlEngineVersion: '4.1.0' });
	});

	it('only reads the fields that have a configured url', () => {
		const statement = {
			extension: [
				{ url: VERSION_URL, valueString: '1.5' },
				{ url: ENGINE_VERSION_URL, valueString: '4.1.0' },
			],
		};
		expect(readCqlVersions(statement, { cqlVersion: VERSION_URL })).toEqual({
			cqlVersion: '1.5',
		});
	});

	it('also looks at the rest entry, and accepts valueCode', () => {
		const statement = {
			resourceType: 'CapabilityStatement',
			rest: [{ mode: 'server', extension: [{ url: VERSION_URL, valueCode: '2.0' }] }],
		};
		expect(readCqlVersions(statement, { cqlVersion: VERSION_URL })).toEqual({
			cqlVersion: '2.0',
		});
	});

	it('ignores blank values, blank urls and unrelated extensions', () => {
		const statement = {
			extension: [
				{ url: VERSION_URL, valueString: '   ' },
				{ url: 'http://example.org/other', valueString: '9.9' },
			],
		};
		expect(readCqlVersions(statement, { cqlVersion: VERSION_URL })).toEqual({});
		expect(readCqlVersions(statement, { cqlVersion: '  ' })).toEqual({});
	});

	it('is empty for a missing statement', () => {
		expect(readCqlVersions(undefined, { cqlVersion: VERSION_URL })).toEqual({});
	});
});

describe('resolveValue', () => {
	it('prefers a server-declared value and records the source', () => {
		expect(resolveValue('4.1.0', '3.0.0')).toEqual({
			value: '4.1.0',
			source: 'capability-statement',
		});
	});

	it('falls back to config when the server declares nothing or only blank', () => {
		expect(resolveValue(undefined, '3.0.0')).toEqual({ value: '3.0.0', source: 'config' });
		expect(resolveValue('  ', '3.0.0')).toEqual({ value: '3.0.0', source: 'config' });
	});

	it('reports a missing configured value as config-sourced, not server-sourced', () => {
		expect(resolveValue(undefined, undefined)).toEqual({ value: '', source: 'config' });
	});
});

describe('declaresOperation', () => {
	it('detects the system-level $cql operation', () => {
		expect(declaresOperation(hapiStatement(), '$cql')).toBe(true);
		expect(declaresOperation(hapiStatement(), 'cql')).toBe(true);
	});

	it('detects Library/$evaluate as a Library resource operation', () => {
		expect(declaresOperation(hapiStatement(), '$evaluate')).toBe(true);
	});

	it('does not accept a Library operation as a system-level one, or vice versa', () => {
		const systemOnly = {
			rest: [{ operation: [{ name: 'cql' }], resource: [{ type: 'Library', operation: [] }] }],
		};
		expect(declaresOperation(systemOnly, '$evaluate')).toBe(false);

		const libraryOnly = {
			rest: [{ operation: [], resource: [{ type: 'Library', operation: [{ name: 'evaluate' }] }] }],
		};
		expect(declaresOperation(libraryOnly, '$cql')).toBe(false);
	});

	it('is undefined when the statement declares no operations at all', () => {
		// Not the same as declaring the operation absent, so a caller must not treat it as failure.
		expect(declaresOperation({ resourceType: 'CapabilityStatement' }, '$cql')).toBeUndefined();
		expect(declaresOperation({ rest: [{ mode: 'server' }] }, '$cql')).toBeUndefined();
		expect(declaresOperation(undefined, '$cql')).toBeUndefined();
	});

	it('reports an operation the server does not declare', () => {
		const noCql = { rest: [{ operation: [{ name: 'reindex' }] }] };
		expect(declaresOperation(noCql, '$cql')).toBe(false);
	});
});
