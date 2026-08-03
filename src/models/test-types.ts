export interface TestExpression {
	text: string;
	invalid: 'false' | 'true' | 'semantic';
}

export interface TestLibrary {
	text: string;
	invalid: 'false' | 'true' | 'semantic';
}

export interface TestOutput {
	text: string;
	// For library-style tests, the name of the define whose result this output describes.
	name?: string;
	type?:
		| 'boolean'
		| 'code'
		| 'date'
		| 'dateTime'
		| 'decimal'
		| 'integer'
		| 'long'
		| 'quantity'
		| 'string'
		| 'time';
}

export interface Test {
	name: string;
	version?: string;
	versionTo?: string;
	description?: string;
	reference?: string;
	inputFile?: string;
	predicate?: boolean;
	mode?: 'strict' | 'loose';
	ordered?: boolean;
	checkOrderedFunctions?: boolean;
	// A test provides EITHER an expression OR a full CQL library (mutually exclusive; see testSchema.xsd).
	expression?: string | TestExpression;
	library?: string | TestLibrary;
	capability: CapabilityKV[];
	output?: string | TestOutput | string[] | TestOutput[];
}

export interface TestGroup {
	name: string;
	version?: string;
	description?: string;
	reference?: string;
	notes?: string;
	test: Test[];
}

export interface Tests {
	name: string;
	version?: string;
	description?: string;
	reference?: string;
	notes?: string;
	group: TestGroup[];
}

export interface CapabilityKV {
	code: string;
	value?: boolean | string | number | object | any[];
	system?: string;
	display?: string;
	version?: string;
}

// Internal Result type used during test execution (allows 'undefined' for invalid)
export interface InternalTestResult {
	testStatus?: 'pass' | 'fail' | 'skip' | 'error';
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
	invalid?: 'false' | 'true' | 'semantic' | 'undefined';
	expression: string;
	// For library-style tests: the full CQL library source, sent to Library/$evaluate wrapped as
	// a FHIR Library resource. (For these tests, `expression` holds the name of the define whose
	// result is compared.)
	library?: string;
	capability?: CapabilityKV[];
	SkipMessage?: string;
}

// Schema-compliant TestResult type (strictly matches cql-test-results.schema.json)
export interface TestResult {
	testStatus?: 'pass' | 'fail' | 'skip' | 'error';
	skipMessage?: string;
	responseStatus?: number;
	actual?: string;
	expected?: string;
	error?: {
		message: string;
		name?: string;
		stack?: string;
	};
	testsName: string;
	groupName: string;
	testName: string;
	invalid?: 'false' | 'true' | 'semantic';
	capabilities?: CapabilityKV[];
	expression: string;
}
