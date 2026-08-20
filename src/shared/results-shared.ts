import type { Tests, Test, InternalTestResult, CapabilityKV } from '../models/test-types.js';
import type { Parameters } from 'fhir/r4';

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
		} else if (this.invalid !== 'true' && this.invalid !== 'semantic') {
			// No output is expected only when the expression is marked invalid ("true"
			// for a run-time error, "semantic" for a translation error) — the test expects
			// an error. Otherwise there is nothing to compare against, so skip.
			this.testStatus = 'skip';
			this.skipMessage = 'No output specified';
		}

		// The XML parser yields a bare object when a test declares exactly one
		// <capability> element, and an array only for two or more. Matching on
		// Array.isArray alone therefore dropped the capability for every
		// single-capability test — the large majority of the suite. Normalize to an
		// array first.
		const testCapabilities = Array.isArray(test.capability)
			? test.capability
			: test.capability !== undefined && test.capability !== null
				? [test.capability]
				: [];

		this.capability = testCapabilities.map(({ code, value }) => ({ code, value }));
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
 * Determines whether a CQL evaluation response represents an error. Used to decide
 * whether `invalid="true"`/`invalid="semantic"` tests pass (an error is expected).
 *
 * The engine does not always signal a run-time error with a non-2xx HTTP status: the
 * FHIR `$cql`/`$evaluate` operations typically return HTTP 200 with a `Parameters`
 * resource carrying an `evaluation error` parameter (an OperationOutcome). We treat
 * both a non-2xx status and the presence of that parameter as an error.
 */
export function responseIndicatesError(status: number | undefined, responseBody: any): boolean {
	if (status !== undefined && (status < 200 || status >= 300)) {
		return true;
	}
	const parameters = responseBody?.parameter;
	if (Array.isArray(parameters)) {
		return parameters.some((p: any) => p?.name === 'evaluation error');
	}
	return false;
}

export function generateParametersResource(
	result: InternalTestResult,
	cqlEndpoint: string,
	libraryCanonical?: string
): Parameters {
	let data: Parameters;

	// Library-style tests carry a complete CQL library, which only Library/$evaluate can accept.
	// The $cql operation has no way to carry library source — its `library` parameter resolves by
	// canonical url only, and its `expression` parameter is an expression of CQL, not the text of
	// a library. The library is published to the server first (see publishTestLibrary) and
	// referenced here by canonical url.
	if (result.library !== undefined) {
		if (cqlEndpoint !== '$evaluate') {
			throw new Error(
				`Library-style tests require the Library/$evaluate operation; configured operation is ${cqlEndpoint}`
			);
		}

		if (libraryCanonical === undefined) {
			throw new Error(
				'Library-style tests require the canonical url of the published library'
			);
		}

		return {
			resourceType: 'Parameters',
			parameter: [
				{
					name: 'url',
					valueCanonical: libraryCanonical,
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
