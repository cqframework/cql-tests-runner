import { Tests, Test, InternalTestResult, CapabilityKV } from '../models/test-types.js';
import { Library, Parameters } from 'fhir/r4';

export class Result implements InternalTestResult {
	testStatus!: 'pass' | 'fail' | 'skip' | 'error';
	skipMessage?: string;
	responseStatus?: number;
	actual?: any;
	expected?: string;
	error?: {
		message: string;
		name?: string;
		stack?: string;
	};
	testsName: string;
	groupName: string;
	testName: string;
	testVersion?: string;
	testVersionTo?: string;
	invalid: 'false' | 'true' | 'semantic' | 'undefined';
	expression: string;
	library?: string;
	capability: CapabilityKV[] = [];

	constructor(testsName: string, groupName: string, test: Test) {
		this.testsName = testsName;
		this.groupName = groupName;
		this.testName = test.name;
		this.testVersion = test.version;
		this.testVersionTo = test.versionTo;

		if (test.library !== undefined) {
			// Library-style test: the whole CQL library is sent to Library/$evaluate as an inline
			// FHIR Library resource, and `expression` names the define whose result is compared.
			// The define name comes from the output's `name` attribute (testSchema.xsd).
			if (typeof test.library === 'string') {
				this.invalid = 'false';
				this.library = test.library;
			} else {
				this.invalid = test.library.invalid;
				this.library = test.library.text;
			}

			this.expression = '';
			const outputs = Array.isArray(test.output) ? test.output : [test.output];
			if (outputs.length > 1) {
				// The schema allows one output per define; the result model holds a single
				// expected value, so multi-define libraries can't be compared yet.
				this.testStatus = 'skip';
				this.skipMessage =
					'Library-style tests with more than one named output are not yet supported';
			} else {
				const out = outputs[0];
				const defineName = typeof out === 'object' ? out.name : undefined;
				if (defineName) {
					this.expression = defineName;
				} else {
					this.testStatus = 'skip';
					this.skipMessage =
						"Library-style test output has no 'name' attribute naming the define to evaluate";
				}
			}
		} else if (typeof test.expression !== 'string') {
			if (test.expression === undefined) {
				this.invalid = 'undefined';
				this.expression = 'undefined';
			} else {
				this.invalid = test.expression.invalid;
				this.expression = test.expression.text;
			}
		} else {
			this.invalid = 'false';
			this.expression = test.expression;
		}

		if (test.output !== undefined) {
			if (typeof test.output !== 'string' && !Array.isArray(test.output)) {
				// TODO: Structure the result if it can be structured (i.e. is one of the expected types)
				this.expected = test.output.text;
			} else {
				this.expected = test.output as string;
			}
		} else {
			this.testStatus = 'skip';
			this.skipMessage = 'No output specified';
		}

		this.capability = Array.isArray(test.capability)
			? test.capability.map(({ code, value }) => ({ code, value }))
			: [];
	}
}

export async function generateEmptyResults(
	tests: Tests[],
	quickTest: boolean
): Promise<Result[][]> {
	console.log('QuickTest: ' + quickTest);

	let results: Result[] = [];
	let groupResults: Result[][] = [];

	for (const ts of tests) {
		console.log('Tests: ' + ts.name);
		let groupTests: Result[] = [];

		for (const group of ts.group) {
			console.log('    Group: ' + group.name);
			let test = group.test;

			if (test != undefined) {
				for (const t of test) {
					console.log('        Test: ' + t.name);
					const r = new Result(ts.name, group.name, t);
					results.push(r);
					groupTests.push(r);
				}
			}

			if (quickTest) {
				break; // Only load 1 group for testing
			}
		}

		groupResults.push(groupTests);

		if (quickTest) {
			break; // Only load 1 test set for testing
		}
	}

	return groupResults;
}

/**
 * Wraps CQL source as a FHIR Library resource conforming to the CQLLibrary profile in the
 * Using CQL IG, as required by the `library` parameter of Library/$evaluate: exactly one
 * `content` element whose contentType starts with `text/cql` (clb-1) carrying base-64 encoded
 * data (clb-2), with a name of 64 characters or less (clb-3).
 *
 * Name and version are read from the library declaration so the resource carries the same
 * identity the CQL itself declares (engines resolve and cache libraries by name and version).
 */
export function buildCqlLibraryResource(cql: string): Library {
	const source = cql.trim();
	const declaration =
		/^library\s+("[^"]+"|[A-Za-z_][A-Za-z0-9_.]*)(?:\s+version\s+'([^']*)')?/m.exec(source);

	if (declaration === null) {
		throw new Error('Library-style test CQL has no library declaration');
	}

	const name = declaration[1].replace(/^"|"$/g, '');
	const version = declaration[2];

	if (name.length > 64) {
		throw new Error(
			`Library name '${name}' exceeds the 64 character limit of the CQLLibrary profile`
		);
	}

	return {
		resourceType: 'Library',
		url: `https://hl7.org/fhir/uv/cql/Library/${name}`,
		name,
		...(version !== undefined ? { version } : {}),
		status: 'active',
		type: {
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/library-type',
					code: 'logic-library',
				},
			],
		},
		content: [
			{
				contentType: 'text/cql',
				data: Buffer.from(source, 'utf8').toString('base64'),
			},
		],
	};
}

export function generateParametersResource(
	result: InternalTestResult,
	cqlEndpoint: string
): Parameters {
	let data: Parameters;

	// Library-style tests carry a complete CQL library, which only Library/$evaluate can accept:
	// its `library` parameter takes the library as a FHIR resource. The $cql operation has no way
	// to carry library source — its `library` parameter resolves by canonical url only, and its
	// `expression` parameter is an expression of CQL, not the text of a library.
	if (result.library !== undefined) {
		if (cqlEndpoint !== '$evaluate') {
			throw new Error(
				`Library-style tests require the Library/$evaluate operation; configured operation is ${cqlEndpoint}`
			);
		}

		return {
			resourceType: 'Parameters',
			parameter: [
				// `library` is mutually exclusive with `url`, so no url parameter is sent here.
				{
					name: 'library',
					resource: buildCqlLibraryResource(result.library),
				},
				// `expression` (0..*) names the define to evaluate; the response is keyed by that name.
				{
					name: 'expression',
					valueString: result.expression,
				},
			],
		};
	}

	// Check if the last part is $cql or $evaluate
	if (cqlEndpoint === '$cql') {
		data = {
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'expression',
					valueString: result.expression,
				},
			],
		};
	} else if (cqlEndpoint === '$evaluate') {
		data = {
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'url',
					valueCanonical:
						'https://hl7.org/fhir/uv/cql/Library/' + result.testsName + '|1.0.000',
				},
				{
					name: 'expression',
					valueString: '' + result.groupName + '.' + result.testName + '',
				},
			],
		};
	} else {
		console.log('The URL does not end with $cql or $evaluate');
		throw new Error('Invalid CQL endpoint');
	}

	return data;
}
