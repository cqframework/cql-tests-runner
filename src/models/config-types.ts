// A SkipList/OnlyList entry selects a whole suite when only `testsName` is given, a group when
// `groupName` is also given, and a single test when `testName` is given as well.
export interface SkipItem {
	testsName: string;
	groupName?: string;
	testName?: string;
	reason: string;
}

export interface OnlyItem {
	testsName: string;
	groupName?: string;
	testName?: string;
}

// Schema-compliant Config type (strictly matches cql-test-configuration.schema.json)
export interface Config {
	FhirServer: {
		BaseUrl: string;
		ogBaseUrl?: string;
		CqlOperation: string;
	};
	Build: {
		CqlFileVersion: string;
		CqlOutputPath: string;
		CqlVersion?: string;
		testsRunDescription?: string;
		cqlTranslator?: string;
		cqlTranslatorVersion?: string;
		cqlEngine?: string;
		cqlEngineVersion?: string;
	};
	Tests: {
		ResultsPath: string;
		SkipList: SkipItem[];
		OnlyList?: OnlyItem[];
	};
	Debug: {
		QuickTest: boolean;
	};
	// Runtime-only fields (not in schema, computed from Config)
	CqlEndpoint?: string;
	apiUrl?: string;
}
