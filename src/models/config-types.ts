export interface SkipItem {
  testsName: string;
  groupName: string;
  testName: string;
  reason: string;
}

export interface Config {
  FhirServer: {
    BaseUrl: string;
    CqlOperation: string;
  };
  Build: {
    CqlFileVersion: string;
    CqlOutputPath: string;
    CqlVersion?: string;
  };
  Tests: {
    ResultsPath: string;
    SkipList: SkipItem[];
    testRunDescription: string;
  };
  Debug: {
    QuickTest: boolean;
  };
  CqlEndpoint: string;
  apiUrl: string;
}
