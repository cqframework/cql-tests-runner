export interface SkipItem {
	testsName: string;
	groupName: string;
	testName: string;
	reason: string;
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
		testsRunDescription?: string; // Note: schema has this misplaced but it's used in code
	};
	Tests: {
		ResultsPath: string;
		SkipList: SkipItem[];
	};
	Debug: {
		QuickTest: boolean;
	};
	// Runtime-only fields (not in schema, computed from Config)
	CqlEndpoint?: string;
	apiUrl?: string;
}
