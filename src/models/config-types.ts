import type { CapabilityVersionExtensions } from '../cql-engine/capability-statement.js';

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
		/**
		 * Extension urls under which the target server publishes its CQL implementation versions,
		 * keyed by the value they carry. No extension for these is registered, so there is no
		 * default: unset means the configured version values above are used as-is.
		 */
		CapabilityVersionExtensions?: CapabilityVersionExtensions;
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
