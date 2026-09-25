export interface SkipItem {
	testsName: string;
	groupName: string;
	testName: string;
	reason: string;
}

export interface OnlyItem {
	testsName: string;
	groupName: string;
	testName: string;
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
		/** Decode `cqf-cqlText` interval results (CQF-specific, not CQL spec). Defaults to true. */
		DecodeCqfCqlText?: boolean;
	};
	// Runtime-only fields (not in schema, computed from Config)
	CqlEndpoint?: string;
	apiUrl?: string;
}
