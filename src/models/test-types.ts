export interface TestExpression {
  text: string;
  invalid: 'false' | 'true' | 'semantic';
}

export interface TestOutput {
  text: string;
  type?: 'boolean' | 'code' | 'date' | 'dateTime' | 'decimal' | 'integer' | 'long' | 'quantity' | 'string' | 'time';
}

export interface Test {
  name: string;
  version?: string;
  description?: string;
  reference?: string;
  inputFile?: string;
  predicate?: boolean;
  mode?: 'strict' | 'loose';
  ordered?: boolean;
  checkOrderedFunctions?: boolean;
  expression: string | TestExpression;
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

export interface TestResult {
  testStatus: 'pass' | 'fail' | 'skip' | 'error';
  responseStatus?: number;
  actual?: any;
  expected?: string;
  error?: {
    message: string;
    stack: string;
  };
  testsName: string;
  groupName: string;
  testName: string;
  invalid: 'false' | 'true' | 'semantic' | 'undefined';
  expression: string;
  SkipMessage?: string;
}
