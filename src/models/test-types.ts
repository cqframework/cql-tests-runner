export interface TestExpression {
	text: string;
	invalid: 'false' | 'true' | 'semantic';
}

export interface TestOutput {
	text: string;
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
	expression: string | TestExpression;
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
	capability?: CapabilityKV[];
	SkipMessage?: string;
}

// Schema-compliant TestResult type (strictly matches cql-test-results.schema.json)
export interface TestResult {
	testStatus?: 'pass' | 'fail' | 'skip' | 'error';
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
