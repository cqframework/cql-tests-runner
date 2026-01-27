import express, { Request, Response } from 'express';
import * as fs from 'fs';
import { ConfigValidator } from '../conf/config-validator.js';
import { ResultsValidator } from '../conf/results-validator.js';
import { JobManager } from '../jobs/job-manager.js';
import { JobProcessor } from '../jobs/job-processor.js';
import { ServerConnectivity, ServerConnectivityError } from '../shared/server-connectivity.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TestExecutionService } from './test-execution-service.js';
import { createConfigFromData } from './config-utils.js';
import { getSchemaPath } from './schema-utils.js';

export interface RestRoutesDependencies {
  app: express.Application;
  testExecutionService: TestExecutionService;
  jobManager: JobManager;
  jobProcessor: JobProcessor;
  mcpTransport: StreamableHTTPServerTransport;
}

/**
 * Sets up all REST API routes
 */
export function setupRestRoutes(deps: RestRoutesDependencies): void {
  const { app, testExecutionService, jobManager, jobProcessor, mcpTransport } = deps;

  // GET root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'CQL Tests Runner Server',
      instructions: 'To run tests, send a POST request with a configuration document in the request body',
      endpoints: {
        'GET /': 'This endpoint - shows server information',
        'POST /': 'Run CQL tests with provided configuration (synchronous)',
        'POST /jobs': 'Create a new job to run CQL tests asynchronously',
        'GET /jobs/:id': 'Get job status and results by job ID',
        'POST /validate/configuration': 'Validate a test configuration JSON against the schema',
        'POST /validate/results': 'Validate a test results JSON against the schema',
        'GET /schema/configuration': 'Get the raw JSON schema for test configuration',
        'GET /schema/results': 'Get the raw JSON schema for test results',
        'GET /health': 'Health check endpoint',
        'POST /mcp': 'MCP (Model Context Protocol) endpoint for JSON-RPC requests',
        'GET /mcp': 'MCP endpoint for Server-Sent Events (SSE) streaming',
      },
    });
  });

  // POST root endpoint for running tests
  app.post('/', async (req: Request, res: Response) => {
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
      const results = await testExecutionService.runTests(configData);
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
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // POST /jobs endpoint - Create a new job
  app.post('/jobs', async (req: Request, res: Response) => {
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
      const config = createConfigFromData(configData);
      const serverBaseUrl = config.FhirServer.BaseUrl;
      await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

      // Create job and start processing asynchronously
      const jobResponse = await jobManager.createJob(configData);
      
      // Start processing the job asynchronously (don't await)
      jobProcessor.processJob(jobResponse.jobId).catch(error => {
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
  app.get('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      
      if (!jobId || jobId.trim() === '') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Job ID parameter is required and cannot be empty'
        });
      }

      const jobStatus = await jobManager.getJobStatus(jobId);
      
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

  // POST /validate/configuration endpoint - Validate test configuration
  app.post('/validate/configuration', async (req: Request, res: Response) => {
    try {
      const configData = req.body;
      
      if (!configData || typeof configData !== 'object') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Request body is required and must be a valid JSON object'
        });
      }

      const validator = new ConfigValidator();
      const validation = validator.validateConfig(configData);
      
      if (validation.isValid) {
        return res.status(200).json({
          valid: true,
          message: 'Configuration is valid'
        });
      } else {
        return res.status(422).json({
          valid: false,
          error: 'Unprocessable Entity',
          message: 'Configuration validation failed',
          details: validator.formatErrors(validation.errors),
          errors: validation.errors
        });
      }
    } catch (error: any) {
      console.error('Error validating configuration:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate configuration',
        details: error.message
      });
    }
  });

  // POST /validate/results endpoint - Validate test results
  app.post('/validate/results', async (req: Request, res: Response) => {
    try {
      const resultsData = req.body;
      
      if (!resultsData || typeof resultsData !== 'object') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Request body is required and must be a valid JSON object'
        });
      }

      const validator = new ResultsValidator();
      const validation = validator.validateResults(resultsData);
      
      if (validation.isValid) {
        return res.status(200).json({
          valid: true,
          message: 'Results are valid'
        });
      } else {
        return res.status(422).json({
          valid: false,
          error: 'Unprocessable Entity',
          message: 'Results validation failed',
          details: validator.formatErrors(validation.errors),
          errors: validation.errors
        });
      }
    } catch (error: any) {
      console.error('Error validating results:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate results',
        details: error.message
      });
    }
  });

  // GET /schema/configuration endpoint - Get configuration schema
  app.get('/schema/configuration', (req: Request, res: Response) => {
    try {
      const schemaPath = getSchemaPath('cql-test-configuration');
      if (!schemaPath || !fs.existsSync(schemaPath)) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Configuration schema file not found'
        });
      }
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);
      res.setHeader('Content-Type', 'application/json');
      res.json(schema);
    } catch (error: any) {
      console.error('Error reading configuration schema:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to read configuration schema',
        details: error.message
      });
    }
  });

  // GET /schema/results endpoint - Get results schema
  app.get('/schema/results', (req: Request, res: Response) => {
    try {
      const schemaPath = getSchemaPath('cql-test-results');
      if (!schemaPath || !fs.existsSync(schemaPath)) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Results schema file not found'
        });
      }
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);
      res.setHeader('Content-Type', 'application/json');
      res.json(schema);
    } catch (error: any) {
      console.error('Error reading results schema:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to read results schema',
        details: error.message
      });
    }
  });

  // MCP endpoints - Streamable HTTP transport
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      // Handle JSON-RPC 2.0 requests using transport
      await mcpTransport.handleRequest(req, res, req.body);
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    try {
      // Handle SSE streaming - GET requests are handled by the transport
      // The transport will check Accept header and handle SSE if needed
      await mcpTransport.handleRequest(req, res);
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
        });
      }
    }
  });

  // 404 handler - Express 5.x compatible catch-all
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
  });
}
