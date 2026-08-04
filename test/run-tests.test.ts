import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { TestRunner } from '../src/services/test-runner.js';
import * as ResultsUtils from '../src/shared/results-utils.js';
import * as ResultsShared from '../src/shared/results-shared.js';

vi.mock('../src/loaders/test-loader', () => ({
  TestLoader: { load: vi.fn().mockReturnValue([]) },
}));

const makeResult = (testsName: string, groupName: string, testName: string) => ({
  testsName,
  groupName,
  testName,
  expression: 'true',
  expected: 'true',
  invalid: 'false',
  capability: [],
});

vi.mock('../src/shared/results-shared', () => ({
  generateEmptyResults: vi
    .fn()
    .mockImplementation(async () => [
      [makeResult('Suite1', 'Group1', 'Test1'), makeResult('Suite1', 'Group1', 'Test2')],
    ]),
  generateParametersResource: vi.fn().mockReturnValue({}),
}));

const baseConfig = {
  FhirServer: { BaseUrl: 'http://localhost:8080/fhir', CqlOperation: '$cql' },
  Build: {},
  Debug: { QuickTest: false },
  Tests: { ResultsPath: './results', SkipList: [] as any[], OnlyList: [] as any[] },
};

describe('RunTests filtering (TestRunner)', () => {
  let runner: TestRunner;
  let fetchSpy: Mock;
  let resultsEqualSpy: Mock;
  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);
    resultsEqualSpy = vi.spyOn(ResultsUtils, 'resultsEqual').mockReturnValue(true);
    runner = new TestRunner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (process.env as any).ONLY_LIST;
    delete (process.env as any).SKIP_LIST;
  });

  it('runs all tests when SkipList and OnlyList are empty', async () => {
    const config = {
      ...baseConfig,
      Tests: {
        ResultsPath: './results',
        SkipList: [],
        OnlyList: [],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    expect(test1?.testStatus).toBe('pass');
    expect(test2?.testStatus).toBe('pass');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 2,
      skipCount: 0,
      failCount: 0,
      errorCount: 0,
    });
  });

  it('skips tests in SkipList', async () => {
    const config = {
      FhirServer: { BaseUrl: 'http://localhost:8080/fhir', CqlOperation: '$cql' },
      Build: {},
      Debug: { QuickTest: false },
      Tests: {
        ResultsPath: './results',
        SkipList: [
          {
            testsName: 'Suite1',
            groupName: 'Group1',
            testName: 'Test1',
            reason: 'Disabled',
          },
        ],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    expect(test1?.testStatus).toBe('skip');
    expect(test2?.testStatus).toBe('pass');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 1,
      failCount: 0,
      errorCount: 0,
    });
  });

  it('runs only tests in OnlyList (others skipped)', async () => {
    const config = {
      ...baseConfig,
      Tests: {
        ...baseConfig.Tests,
        OnlyList: [{ testsName: 'Suite1', groupName: 'Group1', testName: 'Test2' }],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    // Two tests total in our mock, one should be run (pass), the other skipped
    const statuses = results.results.map(r => ({
      key: `${r.testsName}-${r.groupName}-${r.testName}`,
      status: r.testStatus,
    }));
    expect(statuses).toContainEqual({ key: 'Suite1-Group1-Test2', status: 'pass' });
    expect(statuses).toContainEqual({ key: 'Suite1-Group1-Test1', status: 'skip' });
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 1,
      failCount: 0,
      errorCount: 0,
    });
  });

  it('skips a test present in both OnlyList and SkipList', async () => {
    const config = {
      ...baseConfig,
      Tests: {
        ...baseConfig.Tests,
        OnlyList: [{ testsName: 'Suite1', groupName: 'Group1', testName: 'Test2' }],
        SkipList: [
          {
            testsName: 'Suite1',
            groupName: 'Group1',
            testName: 'Test2',
            reason: 'Disabled',
          },
        ],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    expect(test2?.testStatus).toBe('skip');
    expect(test1?.testStatus).toBe('skip');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 0,
      skipCount: 2,
      failCount: 0,
      errorCount: 0,
    });
  });

  it('reports failure for unequal results', async () => {
    resultsEqualSpy.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const config = {
      ...baseConfig,
      Tests: {
        ResultsPath: './results',
        SkipList: [],
        OnlyList: [],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    expect(test1?.testStatus).toBe('pass');
    expect(test2?.testStatus).toBe('fail');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 0,
      failCount: 1,
      errorCount: 0,
    });
  });

  it('reports failure for HTTP 500 result', async () => {
    fetchSpy
      // server connectivity
      .mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({}),
      } as Response)
      // test 1
      .mockResolvedValueOnce({
        status: 500,
        json: () => Promise.resolve({}),
      } as Response)
      // test 2 and beyond
      .mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);

    const config = {
      ...baseConfig,
      Tests: {
        ResultsPath: './results',
        SkipList: [],
        OnlyList: [],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    expect(test1?.testStatus).toBe('fail');
    expect(test2?.testStatus).toBe('pass');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 0,
      failCount: 1,
      errorCount: 0,
    });
  });

  it('reports error for thrown error on fetch', async () => {
    fetchSpy.mockReset();
    fetchSpy
      // server connectivity
      .mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({}),
      } as Response)
      // test 1
      .mockRejectedValueOnce(new Error('error'))
      // test 2 and beyond
      .mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);

    const config = {
      ...baseConfig,
      Tests: {
        ResultsPath: './results',
        SkipList: [],
        OnlyList: [],
      },
    };

    const results = await runner.runTests(config, { useAxios: false });
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    expect(test1?.testStatus).toBe('error');
    expect(test2?.testStatus).toBe('pass');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 0,
      failCount: 0,
      errorCount: 1,
    });
  });

  it('SKIP_LIST env var overrides config Tests.SkipList', async () => {
    const config = {
      ...baseConfig,
      Tests: {
        ...baseConfig.Tests,
        // Config SkipList skips Test1, but env will skip Test2 instead
        SkipList: [
          { testsName: 'Suite1', groupName: 'Group1', testName: 'Test1', reason: 'Cfg' },
        ],
        OnlyList: [],
      },
    };

    process.env.SKIP_LIST = JSON.stringify([
      { testsName: 'Suite1', groupName: 'Group1', testName: 'Test2', reason: 'Env' },
    ]);

    const results = await runner.runTests(config, { useAxios: false });
    const test1 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test1'
    );
    const test2 = results.results.find(
      r => r.testsName === 'Suite1' && r.groupName === 'Group1' && r.testName === 'Test2'
    );
    expect(test1?.testStatus).toBe('pass');
    expect(test2?.testStatus).toBe('skip');
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 1,
      failCount: 0,
      errorCount: 0,
    });
  });

  it('ONLY_LIST env var overrides config Tests.OnlyList', async () => {
    const config = {
      ...baseConfig,
      Tests: {
        ...baseConfig.Tests,
        // Config says run Test1
        OnlyList: [{ testsName: 'Suite1', groupName: 'Group1', testName: 'Test1' }],
      },
    };

    // Env says run Test2 instead
    process.env.ONLY_LIST = JSON.stringify([
      { testsName: 'Suite1', groupName: 'Group1', testName: 'Test2' },
    ]);

    const results = await runner.runTests(config, { useAxios: false });
    const statuses = results.results.map(r => ({
      key: `${r.testsName}-${r.groupName}-${r.testName}`,
      status: r.testStatus,
    }));
    expect(statuses).toContainEqual({ key: 'Suite1-Group1-Test2', status: 'pass' });
    expect(statuses).toContainEqual({ key: 'Suite1-Group1-Test1', status: 'skip' });
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 1,
      skipCount: 1,
      failCount: 0,
      errorCount: 0,
    });
  });
});

describe('Library-style tests (TestRunner)', () => {
  let runner: TestRunner;
  let fetchSpy: Mock;

  const libraryResult = () => ({
    testsName: 'OverloadMatching',
    groupName: 'OverloadMatching',
    testName: 'SimpleOverloadMatching',
    // For library-style tests `expression` is the name of the define to evaluate.
    expression: 'output',
    library: "library SimpleOverloadMatching version '1.0.0'\n\ndefine output: 'DecimalOverload'",
    expected: "'DecimalOverload'",
    invalid: 'false',
    capability: [],
  });

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);
    vi.spyOn(ResultsUtils, 'resultsEqual').mockReturnValue(true);
    vi.mocked(ResultsShared.generateEmptyResults).mockImplementationOnce(async () => [
      [libraryResult()],
    ]);
    vi.mocked(ResultsShared.generateParametersResource).mockClear();
    runner = new TestRunner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips a library-style test when the server is configured for $cql', async () => {
    const results = await runner.runTests(
      { ...baseConfig, FhirServer: { ...baseConfig.FhirServer, CqlOperation: '$cql' } },
      { useAxios: false }
    );

    const test = results.results[0];
    expect(test.testStatus).toBe('skip');
    expect(test.skipMessage).toMatch(/Library\/\$evaluate/);
    // The library is never sent to an operation that cannot carry it.
    expect(ResultsShared.generateParametersResource).not.toHaveBeenCalled();
    // Only the server connectivity check should have hit the network.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(results.toJSON().testResultsSummary).toEqual({
      passCount: 0,
      skipCount: 1,
      failCount: 0,
      errorCount: 0,
    });
  });

  it('runs a library-style test when the server is configured for $evaluate', async () => {
    const results = await runner.runTests(
      { ...baseConfig, FhirServer: { ...baseConfig.FhirServer, CqlOperation: '$evaluate' } },
      { useAxios: false }
    );

    expect(results.results[0].testStatus).toBe('pass');
    expect(ResultsShared.generateParametersResource).toHaveBeenCalledTimes(1);
    expect(ResultsShared.generateParametersResource).toHaveBeenCalledWith(
      expect.objectContaining({ expression: 'output' }),
      '$evaluate',
      'https://hl7.org/fhir/uv/cql/Library/SimpleOverloadMatching|1.0.0'
    );

    // The library is published before evaluation and removed afterwards.
    const requests = fetchSpy.mock.calls.map(([url, init]: any[]) => `${init?.method ?? 'GET'} ${url}`);
    expect(requests).toContain(
      'PUT http://localhost:8080/fhir/Library/cql-tests-SimpleOverloadMatching'
    );
    expect(requests).toContain(
      'DELETE http://localhost:8080/fhir/Library/cql-tests-SimpleOverloadMatching'
    );
  });
});
