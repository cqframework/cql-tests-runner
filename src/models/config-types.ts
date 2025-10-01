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
  };
  Tests: {
    ResultsPath: string;
    SkipList: SkipItem[];
  };
  Debug: {
    QuickTest: boolean;
  };
  CqlEndpoint: string;
  apiUrl: string;
}
