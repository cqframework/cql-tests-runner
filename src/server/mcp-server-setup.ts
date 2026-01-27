import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { ReadResourceTemplateCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs';
import { TestLoader } from '../loaders/test-loader.js';
import { ConfigValidator } from '../conf/config-validator.js';
import { ResultsValidator } from '../conf/results-validator.js';
import { JobManager } from '../jobs/job-manager.js';
import { JobProcessor } from '../jobs/job-processor.js';
import { ServerConnectivity, ServerConnectivityError } from '../shared/server-connectivity.js';
import { TestExecutionService } from './test-execution-service.js';
import { getSchemaPath } from './schema-utils.js';
import { createConfigFromData } from './config-utils.js';

export interface McpServerSetupDependencies {
  mcpServer: McpServer;
  mcpTransport: StreamableHTTPServerTransport;
  testExecutionService: TestExecutionService;
  jobManager: JobManager;
  jobProcessor: JobProcessor;
}

/**
 * Sets up all MCP server resources and tools
 */
export function setupMcpServer(deps: McpServerSetupDependencies): void {
  const { mcpServer, mcpTransport, testExecutionService, jobManager, jobProcessor } = deps;

  // Register test list resource
  mcpServer.registerResource(
    'test-list',
    'test://list',
    {
      title: 'CQL Test List',
      description: 'Catalog of all available CQL tests',
      mimeType: 'application/json',
    },
    async () => {
      const tests = TestLoader.load();
      const testList: any[] = [];

      for (const testSuite of tests) {
        for (const group of testSuite.group) {
          if (group.test) {
            for (const test of group.test) {
              testList.push({
                testsName: testSuite.name,
                groupName: group.name,
                testName: test.name,
                description: test.description || `Test: ${test.name}`,
                version: test.version,
              });
            }
          }
        }
      }

      return {
        contents: [
          {
            uri: 'test://list',
            mimeType: 'application/json',
            text: JSON.stringify(testList, null, 2),
          },
        ],
      };
    }
  );

  // Register individual test resource template
  const testResourceTemplate = new ResourceTemplate(
    'test://{testsName}/{groupName}/{testName}',
    {
      list: async () => {
        const tests = TestLoader.load();
        const resources: any[] = [];

        for (const testSuite of tests) {
          for (const group of testSuite.group) {
            if (group.test) {
              for (const test of group.test) {
                resources.push({
                  uri: `test://${testSuite.name}/${group.name}/${test.name}`,
                  name: `${testSuite.name}/${group.name}/${test.name}`,
                  description: test.description || `Test: ${test.name}`,
                  mimeType: 'application/json',
                });
              }
            }
          }
        }

        return { resources };
      },
    }
  );

  mcpServer.registerResource(
    'test',
    testResourceTemplate,
    {
      title: 'CQL Test',
      description: 'Individual CQL test definition',
      mimeType: 'application/json',
    },
    (async (uri: URL, variables: any) => {
      const testsName = variables?.testsName as string;
      const groupName = variables?.groupName as string;
      const testName = variables?.testName as string;

      if (!testsName || !groupName || !testName) {
        throw new Error(`Invalid test URI: ${uri.href}`);
      }

      const tests = TestLoader.load();

      for (const testSuite of tests) {
        if (testSuite.name === testsName) {
          for (const group of testSuite.group) {
            if (group.name === groupName && group.test) {
              for (const test of group.test) {
                if (test.name === testName) {
                  return {
                    contents: [
                      {
                        uri: uri.href,
                        mimeType: 'application/json',
                        text: JSON.stringify(
                          {
                            testsName: testSuite.name,
                            groupName: group.name,
                            testName: test.name,
                            description: test.description,
                            version: test.version,
                            versionTo: test.versionTo,
                            expression:
                              typeof test.expression === 'string'
                                ? test.expression
                                : test.expression?.text,
                            output: test.output,
                            capability: test.capability,
                            reference: test.reference,
                            inputFile: test.inputFile,
                            predicate: test.predicate,
                            mode: test.mode,
                            ordered: test.ordered,
                            checkOrderedFunctions: test.checkOrderedFunctions,
                          },
                          null,
                          2
                        ),
                      },
                    ],
                  };
                }
              }
            }
          }
        }
      }

      throw new Error(`Test not found: ${testsName}/${groupName}/${testName}`);
    }) as ReadResourceTemplateCallback
  );

  // Register schema resources
  mcpServer.registerResource(
    'cql-test-configuration-schema',
    'schema://cql-test-configuration',
    {
      title: 'CQL Test Configuration Schema',
      description: 'JSON schema for CQL test configuration validation',
      mimeType: 'application/json',
    },
    async () => {
      const schemaPath = getSchemaPath('cql-test-configuration');
      if (!schemaPath || !fs.existsSync(schemaPath)) {
        throw new Error('Schema file not found: cql-test-configuration.schema.json');
      }
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      return {
        contents: [
          {
            uri: 'schema://cql-test-configuration',
            mimeType: 'application/json',
            text: schemaContent,
          },
        ],
      };
    }
  );

  mcpServer.registerResource(
    'cql-test-results-schema',
    'schema://cql-test-results',
    {
      title: 'CQL Test Results Schema',
      description: 'JSON schema for CQL test results validation',
      mimeType: 'application/json',
    },
    async () => {
      const schemaPath = getSchemaPath('cql-test-results');
      if (!schemaPath || !fs.existsSync(schemaPath)) {
        throw new Error('Schema file not found: cql-test-results.schema.json');
      }
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      return {
        contents: [
          {
            uri: 'schema://cql-test-results',
            mimeType: 'application/json',
            text: schemaContent,
          },
        ],
      };
    }
  );

  // Register tools
  mcpServer.registerTool(
    'run_test',
    {
      description: 'Run a single CQL test',
      inputSchema: z.object({
        testId: z
          .string()
          .describe('Test identifier in format testsName/groupName/testName'),
        config: z
          .any()
          .describe('Configuration object matching cql-test-configuration.schema.json'),
      }),
    },
    async (args: { testId: string; config?: any }, extra?: any) => {
      const { testId, config } = args;
      if (!config) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'config parameter is required',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Validate config
      const validator = new ConfigValidator();
      const validation = validator.validateConfig(config);
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Configuration validation failed',
                  details: validator.formatErrors(validation.errors),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Parse test ID
      const parts = testId.split('/');
      if (parts.length !== 3) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Invalid test ID format. Expected: testsName/groupName/testName',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const [testsName, groupName, testName] = parts;
      const result = await testExecutionService.runSingleTest(testsName, groupName, testName, config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerTool(
    'run_test_group',
    {
      description: 'Run all tests in a group',
      inputSchema: z.object({
        testsName: z.string().describe('Test file name'),
        groupName: z.string().describe('Group name'),
        config: z
          .any()
          .describe('Configuration object matching cql-test-configuration.schema.json'),
      }),
    },
    async (args: { testsName: string; groupName: string; config?: any }, extra?: any) => {
      const { testsName, groupName, config } = args;
      if (!config) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'config parameter is required',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Validate config
      const validator = new ConfigValidator();
      const validation = validator.validateConfig(config);
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Configuration validation failed',
                  details: validator.formatErrors(validation.errors),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const results = await testExecutionService.runTestGroup(testsName, groupName, config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerTool(
    'run_all_tests',
    {
      description: 'Run all CQL tests (equivalent to POST / endpoint)',
      inputSchema: z.object({
        config: z
          .any()
          .describe('Configuration object matching cql-test-configuration.schema.json'),
      }),
    },
    async (args: { config?: any }, extra?: any) => {
      const { config } = args;
      if (!config) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'config parameter is required',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Validate config
      const validator = new ConfigValidator();
      const validation = validator.validateConfig(config);
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Configuration validation failed',
                  details: validator.formatErrors(validation.errors),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const results = await testExecutionService.runTests(config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerTool(
    'create_job',
    {
      description: 'Create an asynchronous test job (equivalent to POST /jobs endpoint)',
      inputSchema: z.object({
        config: z
          .any()
          .describe('Configuration object matching cql-test-configuration.schema.json'),
      }),
    },
    async (args: { config?: any }, extra?: any) => {
      const { config } = args;
      if (!config) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'config parameter is required',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Validate config
      const validator = new ConfigValidator();
      const validation = validator.validateConfig(config);
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Configuration validation failed',
                  details: validator.formatErrors(validation.errors),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const configLoader = createConfigFromData(config);
        const serverBaseUrl = configLoader.FhirServer.BaseUrl;
        await ServerConnectivity.verifyServerConnectivity(serverBaseUrl);

        const jobResponse = await jobManager.createJob(config);
        jobProcessor.processJob(jobResponse.jobId).catch(error => {
          console.error(`Failed to process job ${jobResponse.jobId}:`, error);
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(jobResponse, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error instanceof ServerConnectivityError) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'Service Unavailable',
                    message: 'Test runner cannot connect to the specified FHIR server',
                    details: error.message,
                    code: error.code,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    }
  );

  mcpServer.registerTool(
    'get_job_status',
    {
      description: 'Get job status and results (equivalent to GET /jobs/:id endpoint)',
      inputSchema: z.object({
        jobId: z.string().describe('Job identifier'),
      }),
    },
    async (args: { jobId: string }, extra?: any) => {
      const { jobId } = args;

      if (!jobId || typeof jobId !== 'string') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'Job ID is required and must be a string',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const jobStatus = await jobManager.getJobStatus(jobId);

      if (!jobStatus) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Not Found',
                  message: `Job with ID ${jobId} not found`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(jobStatus, null, 2),
          },
        ],
      };
    }
  );

  mcpServer.registerTool(
    'validate_configuration',
    {
      description: 'Validate a test configuration JSON against the schema (equivalent to POST /validate/configuration endpoint)',
      inputSchema: z.object({
        config: z
          .any()
          .describe('Configuration object to validate against cql-test-configuration.schema.json'),
      }),
    },
    async (args: { config?: any }, extra?: any) => {
      const { config } = args;
      if (!config) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'config parameter is required',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const validator = new ConfigValidator();
      const validation = validator.validateConfig(config);

      if (validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: true,
                  message: 'Configuration is valid',
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: false,
                  error: 'Configuration validation failed',
                  message: 'Configuration validation failed',
                  details: validator.formatErrors(validation.errors),
                  errors: validation.errors,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  mcpServer.registerTool(
    'validate_results',
    {
      description: 'Validate a test results JSON against the schema (equivalent to POST /validate/results endpoint)',
      inputSchema: z.object({
        results: z
          .any()
          .describe('Results object to validate against cql-test-results.schema.json'),
      }),
    },
    async (args: { results?: any }, extra?: any) => {
      const { results } = args;
      if (!results) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Bad Request',
                  message: 'results parameter is required',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const validator = new ResultsValidator();
      const validation = validator.validateResults(results);

      if (validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: true,
                  message: 'Results are valid',
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: false,
                  error: 'Results validation failed',
                  message: 'Results validation failed',
                  details: validator.formatErrors(validation.errors),
                  errors: validation.errors,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Connect transport to server AFTER all resources and tools are registered
  mcpServer.connect(mcpTransport);
}
