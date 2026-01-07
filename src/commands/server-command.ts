import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import cors from 'cors';
import { RunCommand } from './run-tests-command.js';
import { ConfigLoader } from '../conf/config-loader.js';
import { ConfigValidator } from '../conf/config-validator.js';
import { CQLTestResults } from '../test-results/cql-test-results.js';
import { TestLoader } from '../loaders/test-loader.js';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { generateEmptyResults, generateParametersResource } from '../shared/results-shared.js';
import { InternalTestResult } from '../models/test-types.js';
import { JobManager } from '../jobs/job-manager.js';
import { JobProcessor } from '../jobs/job-processor.js';
import { ServerConnectivity, ServerConnectivityError } from '../shared/server-connectivity.js';

// Import extractors
import { EvaluationErrorExtractor } from '../extractors/evaluation-error-extractor.js';
import { NullEmptyExtractor } from '../extractors/null-empty-extractor.js';
import { UndefinedExtractor } from '../extractors/undefined-extractor.js';
import { StringExtractor } from '../extractors/value-type-extractors/string-extractor.js';
import { BooleanExtractor } from '../extractors/value-type-extractors/boolean-extractor.js';
import { IntegerExtractor } from '../extractors/value-type-extractors/integer-extractor.js';
import { DecimalExtractor } from '../extractors/value-type-extractors/decimal-extractor.js';
import { DateExtractor } from '../extractors/value-type-extractors/date-extractor.js';
import { DateTimeExtractor } from '../extractors/value-type-extractors/datetime-extractor.js';
import { TimeExtractor } from '../extractors/value-type-extractors/time-extractor.js';
import { QuantityExtractor } from '../extractors/value-type-extractors/quantity-extractor.js';
import { RatioExtractor } from '../extractors/value-type-extractors/ratio-extractor.js';
import { DateTimeIntervalExtractor } from '../extractors/value-type-extractors/datetime-interval-extractor.js';
import { QuantityIntervalExtractor } from '../extractors/value-type-extractors/quantity-interval-extractor.js';
import { CodeExtractor } from '../extractors/value-type-extractors/code-extractor.js';
import { ConceptExtractor } from '../extractors/value-type-extractors/concept-extractor.js';
import { ResultExtractor } from '../extractors/result-extractor.js';

// Type declaration for CVL loader
declare const cvlLoader: () => Promise<[{ default: any }]>;

export class ServerCommand {
  private _app: express.Application;
  private _server: Server | null = null;
  private port: number;
  private jobManager: JobManager;
  private jobProcessor: JobProcessor;

  constructor(port: number = 3000) {
    this.port = port;
    this._app = express();
    this.jobManager = new JobManager('./jobs');
    this.jobProcessor = new JobProcessor(this.jobManager);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSignalHandlers();
  }

  // Getter for testing purposes
  get app(): express.Application {
    return this._app;
  }

  private setupMiddleware(): void {
    // Parse JSON bodies
    this._app.use(express.json({ limit: '10mb' }));
    
    // CORS middleware - allow all origins
    this._app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: false
    }));

    // Error handling middleware
    this._app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  private setupRoutes(): void {
    // GET root endpoint
    this._app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'CQL Tests Runner Server',
        instructions: 'To run tests, send a POST request with a configuration document in the request body',
        endpoints: {
          'GET /': 'This endpoint - shows server information',
          'POST /': 'Run CQL tests with provided configuration (synchronous)',
          'POST /jobs': 'Create a new job to run CQL tests asynchronously',
          'GET /jobs/:id': 'Get job status and results by job ID',
          'GET /health': 'Health check endpoint'
        }
      });
    });

    // POST root endpoint for running tests
    this._app.post('/', async (req: Request, res: Response) => {
      try {
        const configData = req.body;
        
        if (!configData || typeof configData !== 'object') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Request body is required and must be a valid JSON object'
          });
        }

        // Validate configuration using JSON schema
        const validator = new ConfigValidator();
        const validation = validator.validateConfig(configData);
        
        if (!validation.isValid) {
          return res.status(422).json({
            error: 'Unprocessable Entity',
            message: 'Configuration validation failed',
            details: validator.formatErrors(validation.errors)
          });
        }

        // Run the tests and return results
        const results = await this.runTests(configData);
        res.json(results);

      } catch (error: any) {
        console.error('Error running tests:', error);
        
        // Check if it's a connectivity error using proper type checking
        if (error instanceof ServerConnectivityError) {
          res.status(503).json({
            error: 'Service Unavailable',
            message: 'Test runner cannot connect to the specified FHIR server',
            details: error.message,
            code: error.code
          });
        } else {
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to run tests',
            details: error.message
          });
        }
      }
    });

    // Health check endpoint
    this._app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // POST /jobs endpoint - Create a new job
    this._app.post('/jobs', async (req: Request, res: Response) => {
      try {
        const configData = req.body;
        
        if (!configData || typeof configData !== 'object') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Request body is required and must be a valid JSON object'
          });
        }

        // Validate configuration using JSON schema
        const validator = new ConfigValidator();
        const validation = validator.validateConfig(configData);
        
        if (!validation.isValid) {
          return res.status(422).json({
            error: 'Unprocessable Entity',
            message: 'Configuration validation failed',
            details: validator.formatErrors(validation.errors)
          });
        }

        // Verify server connectivity before creating the job
        const config = this.createConfigFromData(configData);
        const serverBaseUrl = config.FhirServer.BaseUrl;
        await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

        // Create job and start processing asynchronously
        const jobResponse = await this.jobManager.createJob(configData);
        
        // Start processing the job asynchronously (don't await)
        this.jobProcessor.processJob(jobResponse.jobId).catch(error => {
          console.error(`Failed to process job ${jobResponse.jobId}:`, error);
        });

        res.status(202).json(jobResponse);

      } catch (error: any) {
        console.error('Error creating job:', error);
        
        // Check if it's a connectivity error using proper type checking
        if (error instanceof ServerConnectivityError) {
          res.status(503).json({
            error: 'Service Unavailable',
            message: 'Test runner cannot connect to the specified FHIR server',
            details: error.message,
            code: error.code
          });
        } else {
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create job',
            details: error.message
          });
        }
      }
    });

    // GET /jobs/:id endpoint - Get job status and results
    this._app.get('/jobs/:id', async (req: Request, res: Response) => {
      try {
        const jobId = req.params.id;
        
        if (!jobId || jobId.trim() === '') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Job ID parameter is required and cannot be empty'
          });
        }

        const jobStatus = await this.jobManager.getJobStatus(jobId);
        
        if (!jobStatus) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Job with ID ${jobId} not found`
          });
        }

        // Return appropriate status code based on job status
        let statusCode = 200;
        if (jobStatus.status === 'pending') {
          statusCode = 202; // Accepted
        } else if (jobStatus.status === 'running') {
          statusCode = 202; // Accepted
        } else if (jobStatus.status === 'failed') {
          statusCode = 500; // Internal Server Error
        }

        res.status(statusCode).json(jobStatus);

      } catch (error: any) {
        console.error('Error getting job status:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to get job status',
          details: error.message
        });
      }
    });

    // 404 handler - Express 5.x compatible catch-all
    this._app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
      });
    });
  }

  private async runTests(configData: any): Promise<any> {
    // Create a temporary config loader from the provided data
    const config = this.createConfigFromData(configData);
    const serverBaseUrl = config.FhirServer.BaseUrl;
    const cqlEndpoint = config.CqlEndpoint;

    // Verify server connectivity before proceeding
    await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

    const cqlEngine = new CQLEngine(serverBaseUrl, cqlEndpoint);
    cqlEngine.cqlVersion = config.Build?.CqlVersion || '1.5';

    // Load CVL using dynamic import
    // @ts-ignore
    const cvlModule = await import('../../cvl/cvl.mjs');
    const cvl = cvlModule.default;

    const tests = TestLoader.load();
    const quickTest = config.Debug?.QuickTest || false;
    const resultExtractor = this.buildExtractor();
    const emptyResults = await generateEmptyResults(tests, quickTest);
    const skipMap = config.skipListMap();

    const results = new CQLTestResults(cqlEngine);
    
    for (const testFile of emptyResults) {
      for (const result of testFile) {
        await this.runTest(result, cqlEngine.apiUrl!, cvl, resultExtractor, skipMap, config);
        results.add(result);
      }
    }

    // Return the results data that would normally be written to file
    return results.toJSON();
  }

  private buildExtractor(): ResultExtractor {
    const extractors = new EvaluationErrorExtractor();
    extractors
      .setNextExtractor(new NullEmptyExtractor())
      .setNextExtractor(new UndefinedExtractor())
      .setNextExtractor(new StringExtractor())
      .setNextExtractor(new BooleanExtractor())
      .setNextExtractor(new IntegerExtractor())
      .setNextExtractor(new DecimalExtractor())
      .setNextExtractor(new DateExtractor())
      .setNextExtractor(new DateTimeExtractor())
      .setNextExtractor(new TimeExtractor())
      .setNextExtractor(new QuantityExtractor())
      .setNextExtractor(new RatioExtractor())
      .setNextExtractor(new DateTimeIntervalExtractor())
      .setNextExtractor(new QuantityIntervalExtractor())
      .setNextExtractor(new CodeExtractor())
      .setNextExtractor(new ConceptExtractor());
    
    return new ResultExtractor(extractors);
  }

  private async runTest(
    result: InternalTestResult, 
    apiUrl: string, 
    cvl: any, 
    resultExtractor: ResultExtractor, 
    skipMap: Map<string, string>,
    config: ConfigLoader
  ): Promise<InternalTestResult> {
    const key = `${result.testsName}-${result.groupName}-${result.testName}`;
    
    if (result.testStatus === 'skip') {
      result.SkipMessage = 'Skipped by cql-tests-runner';
      return result;
    } else if (skipMap.has(key)) {        
      const reason = skipMap.get(key) || '';
      result.SkipMessage = `Skipped by config: ${reason}`;
      result.testStatus = 'skip';
      return result;
    }

    const data = generateParametersResource(result, config.FhirServer.CqlOperation);

    try {
      console.log('Running test %s:%s:%s', result.testsName, result.groupName, result.testName);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      result.responseStatus = response.status;
      const responseBody = await response.json();
      result.actual = resultExtractor.extract(responseBody);
      const invalid = result.invalid;
      
      if (invalid === 'true' || invalid === 'semantic') {
        result.testStatus = response.status === 200 ? 'fail' : 'pass';
      } else {
        if (response.status === 200) {
          result.testStatus = this.resultsEqual(cvl.parse(result.expected), result.actual) ? 'pass' : 'fail';
        } else {
          result.testStatus = 'fail';
        }
      }
    } catch (error: any) {
      result.testStatus = 'error';
      result.error = { 
        message: error.message, 
        name: error.name || 'Error',
        stack: error.stack 
      };
    }

    console.log('Test %s:%s:%s status: %s expected: %s actual: %s', 
      result.testsName, result.groupName, result.testName, result.testStatus, result.expected, result.actual);
    
    return result;
  }

  private resultsEqual(expected: any, actual: any): boolean {
    if (expected === undefined && actual === undefined) {
      return true;
    }
    
    if (expected === null && actual === null) {
      return true;
    }

    if (typeof expected === 'number') {
      return Math.abs(actual - expected) < 0.00000001;
    }

    if (expected === actual) {
      return true;
    }

    if (typeof expected !== 'object' || expected === null || typeof actual !== 'object' || actual === null) {
      return false;
    }

    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);

    if (expectedKeys.length !== actualKeys.length) return false;

    for (const key of expectedKeys) {
      if (!actualKeys.includes(key) || !this.resultsEqual(expected[key], actual[key])) {
        return false;
      }
    }

    return true;
  }

  private setupSignalHandlers(): void {
    // Handle SIGINT (CTRL-C) and SIGTERM signals
    const gracefulShutdown = (signal: string) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
      this.stop();
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this._server = this._app.listen(this.port, () => {
        console.log(`CQL Tests Runner server listening on port ${this.port}`);
        console.log(`Server running at http://localhost:${this.port}`);
        console.log('Send POST requests with configuration to run tests');
        console.log('Press CTRL-C to stop the server');
        resolve();
      });
    });
  }

  public stop(): void {
    if (this._server) {
      console.log('Shutting down server...');
      this._server.close(async () => {
        // Clean up old jobs before shutting down
        try {
          await this.jobManager.cleanupOldJobs(24); // Clean up jobs older than 24 hours
        } catch (error) {
          console.error('Error cleaning up old jobs:', error);
        }
        console.log('Server has been shut down');
        process.exit(0);
      });
    } else {
      console.log('Server is not running');
      process.exit(0);
    }
  }

  private createConfigFromData(configData: any): ConfigLoader {
    // Create a temporary config loader without validation (we already validated)
    const config = new ConfigLoader(undefined, false);
    
    // Manually populate the config from the provided data
    const baseURL = process.env.SERVER_BASE_URL || configData.FhirServer?.BaseUrl || 'https://cloud.alphora.com/sandbox/r4/cds/fhir';
    
    config.FhirServer = {
      BaseUrl: this.removeTrailingSlash(baseURL),
      CqlOperation: process.env.CQL_OPERATION || configData.FhirServer?.CqlOperation || '$cql'
    };
    
    config.Build = {
      CqlFileVersion: process.env.CQL_FILE_VERSION || configData.Build?.CqlFileVersion || '1.0.000',
      CqlOutputPath: process.env.CQL_OUTPUT_PATH || configData.Build?.CqlOutputPath || './cql',
      CqlVersion: process.env.CQL_VERSION || configData.Build?.CqlVersion,
      testsRunDescription: process.env.TESTS_RUN_DESCRIPTION || configData.Build?.testsRunDescription || ''
    };
    
    config.Tests = {
      ResultsPath: process.env.RESULTS_PATH || configData.Tests?.ResultsPath || './results',
      SkipList: process.env.SKIP_LIST || configData.Tests?.SkipList || []
    };
    
    config.Debug = {
      QuickTest: this.setQuickTestSetting(configData)
    };

    config.CqlEndpoint = this.cqlEndPoint(config.FhirServer.CqlOperation);
    
    return config;
  }

  private removeTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private cqlEndPoint(cqlOperation: string): string {
    if (cqlOperation === '$cql') {
      return '$cql';
    } else {
      return 'Library' + '/$evaluate';
    }
  }

  private setQuickTestSetting(configData: any): boolean {
    if (process.env.QUICK_TEST !== undefined) {
      return process.env.QUICK_TEST === 'true';
    }

    const configValue = configData.Debug?.QuickTest;
    if (configValue !== undefined) {
      return configValue as boolean;
    }

    return true;
  }

}
