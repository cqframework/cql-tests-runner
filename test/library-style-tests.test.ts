import { afterEach, beforeEach, describe, expect, test, vi, Mock } from 'vitest';

import { Result, generateParametersResource } from '../src/shared/results-shared.js';
import { buildCqlLibraryResource, publishTestLibrary } from '../src/shared/library-publisher.js';
import { Test } from '../src/models/test-types.js';

// The shape produced by the XML loader for the library-style test in cqframework/cql-tests#61.
const libraryCql = `library SimpleOverloadMatching version '1.0.0'

define function A(foo Decimal): 'DecimalOverload'
define function A(foo Integer): 'IntegerOverload'

define output: A(1.0)`;

// libraryCql, base-64 encoded (clb-2). Pinned as a literal so the test does not depend on
// Node globals, which the test directory has no type coverage for.
const libraryCqlBase64 =
	'bGlicmFyeSBTaW1wbGVPdmVybG9hZE1hdGNoaW5nIHZlcnNpb24gJzEuMC4wJwoKZGVmaW5lIGZ1bmN0aW9uIEEoZm9vIERlY2ltYWwpOiAnRGVjaW1hbE92ZXJsb2FkJwpkZWZpbmUgZnVuY3Rpb24gQShmb28gSW50ZWdlcik6ICdJbnRlZ2VyT3ZlcmxvYWQnCgpkZWZpbmUgb3V0cHV0OiBBKDEuMCk=';

const canonical = 'https://hl7.org/fhir/uv/cql/Library/SimpleOverloadMatching|1.0.0';

const libraryTest = (over: Partial<Test> = {}): Test =>
	({
		name: 'SimpleOverloadMatching',
		library: libraryCql,
		output: { name: 'output', text: "'DecimalOverload'" },
		capability: [],
		...over,
	}) as Test;

describe('library-style test results', () => {
	test('evaluates the define named by the output', () => {
		const result = new Result('OverloadMatching', 'OverloadMatching', libraryTest());

		expect(result.library).toBe(libraryCql);
		expect(result.expression).toBe('output');
		expect(result.expected).toBe("'DecimalOverload'");
		expect(result.invalid).toBe('false');
		expect(result.testStatus).toBeUndefined();
	});

	test('carries the invalid attribute from the library element', () => {
		const result = new Result(
			'OverloadMatching',
			'OverloadMatching',
			libraryTest({ library: { text: libraryCql, invalid: 'semantic' } })
		);

		expect(result.invalid).toBe('semantic');
		expect(result.library).toBe(libraryCql);
	});

	test('skips when the output does not name a define', () => {
		const result = new Result(
			'OverloadMatching',
			'OverloadMatching',
			libraryTest({ output: "'DecimalOverload'" })
		);

		expect(result.testStatus).toBe('skip');
		expect(result.skipMessage).toMatch(/no 'name' attribute/);
	});

	test('skips library tests with more than one named output', () => {
		const result = new Result(
			'OverloadMatching',
			'OverloadMatching',
			libraryTest({
				output: [
					{ name: 'output', text: "'DecimalOverload'" },
					{ name: 'other', text: "'IntegerOverload'" },
				],
			})
		);

		expect(result.testStatus).toBe('skip');
		expect(result.skipMessage).toMatch(/more than one named output/);
	});
});

describe('CQLLibrary resource', () => {
	test('wraps the CQL as a CQLLibrary-conformant resource', () => {
		const library = buildCqlLibraryResource(libraryCql) as any;

		expect(library.resourceType).toBe('Library');
		expect(library.url).toBe('https://hl7.org/fhir/uv/cql/Library/SimpleOverloadMatching');
		expect(library.name).toBe('SimpleOverloadMatching');
		expect(library.version).toBe('1.0.0');
		expect(library.status).toBe('active');
		expect(library.type.coding[0]).toEqual({
			system: 'http://terminology.hl7.org/CodeSystem/library-type',
			code: 'logic-library',
		});

		// clb-1: exactly one content element starting with text/cql. clb-2: base-64 data.
		expect(library.content).toHaveLength(1);
		expect(library.content[0].contentType).toBe('text/cql');
		expect(library.content[0].data).toBe(libraryCqlBase64);
	});

	test('omits version when the library declaration has none', () => {
		const library = buildCqlLibraryResource('library NoVersion\n\ndefine output: 1') as any;

		expect(library.name).toBe('NoVersion');
		expect(library.version).toBeUndefined();
	});

	test('rejects CQL with no library declaration', () => {
		expect(() => buildCqlLibraryResource('define output: 1 + 1')).toThrow(
			/no library declaration/
		);
	});

	test('rejects a library name longer than the profile allows', () => {
		const tooLong = 'A'.repeat(65);

		expect(() => buildCqlLibraryResource(`library ${tooLong}\n\ndefine output: 1`)).toThrow(
			/64 character limit/
		);
	});
});

describe('publishing a library-style test', () => {
	let fetchSpy: Mock;

	beforeEach(() => {
		fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
			status: 201,
			text: () => Promise.resolve(''),
		} as Response);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('PUTs the library and reports its canonical url', async () => {
		const published = await publishTestLibrary('http://localhost:8080/fhir', libraryCql);

		expect(published.id).toBe('cql-tests-SimpleOverloadMatching');
		expect(published.canonical).toBe(canonical);

		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe('http://localhost:8080/fhir/Library/cql-tests-SimpleOverloadMatching');
		expect(init.method).toBe('PUT');
		const body = JSON.parse(init.body);
		expect(body.resourceType).toBe('Library');
		expect(body.id).toBe('cql-tests-SimpleOverloadMatching');
		expect(body.content[0].data).toBe(libraryCqlBase64);
	});

	test('removes the published library again', async () => {
		const published = await publishTestLibrary('http://localhost:8080/fhir', libraryCql);
		await published.remove();

		const [url, init] = fetchSpy.mock.calls[1];
		expect(url).toBe('http://localhost:8080/fhir/Library/cql-tests-SimpleOverloadMatching');
		expect(init.method).toBe('DELETE');
	});

	test('reports a failed publish', async () => {
		fetchSpy.mockResolvedValue({
			status: 422,
			text: () => Promise.resolve('unprocessable'),
		} as Response);

		await expect(publishTestLibrary('http://localhost:8080/fhir', libraryCql)).rejects.toThrow(
			/Failed to publish library SimpleOverloadMatching.*422 unprocessable/
		);
	});

	test('a failed removal does not throw', async () => {
		const published = await publishTestLibrary('http://localhost:8080/fhir', libraryCql);
		fetchSpy.mockRejectedValue(new Error('connection reset'));

		await expect(published.remove()).resolves.toBeUndefined();
	});
});

describe('Library/$evaluate parameters', () => {
	test('references the published library by canonical url', () => {
		const result = new Result('OverloadMatching', 'OverloadMatching', libraryTest());
		const parameters = generateParametersResource(result, '$evaluate', canonical);

		expect(parameters.parameter!.map(p => p.name)).toEqual(['url', 'expression']);
		expect(parameters.parameter![0].valueCanonical).toBe(canonical);
		expect(parameters.parameter![1].valueString).toBe('output');
	});

	test('refuses to send a library test to the $cql operation', () => {
		const result = new Result('OverloadMatching', 'OverloadMatching', libraryTest());

		expect(() => generateParametersResource(result, '$cql', canonical)).toThrow(
			/require the Library\/\$evaluate operation/
		);
	});

	test('requires the library to have been published', () => {
		const result = new Result('OverloadMatching', 'OverloadMatching', libraryTest());

		expect(() => generateParametersResource(result, '$evaluate')).toThrow(
			/canonical url of the published library/
		);
	});
});
