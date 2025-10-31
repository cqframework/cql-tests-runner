import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { ServerCommand } from '../src/commands/server-command.js';

// Test data and mock helpers
const createMockConfig = (overrides = {}) => ({
  FhirServer: {
    BaseUrl: 'http://localhost:8080/fhir/',
    CqlOperation: '$cql'
  },
  Build: {
    CqlFileVersion: '1.0.000',
    CqlOutputPath: './cql'
  },
  Debug: {
    QuickTest: false
  },
  Tests: {
    ResultsPath: './results',
    SkipList: []
  },
  ...overrides
});

const createMockResults = () => ({
  cqlengine: { apiUrl: 'http://localhost:8080/fhir/$cql', cqlVersion: '1.5' },
  testsRunDateTime: '2025-01-01T00:00:00.000Z',
  testResultsSummary: { passCount: 0, skipCount: 0, failCount: 0, errorCount: 0 },
  results: []
});

// Mock implementations
vi.mock('../src/conf/config-loader', () => ({
  ConfigLoader: vi.fn().mockImplementation(function(this: any, configData?: any) {
    this.FhirServer = {
      BaseUrl: configData?.FhirServer?.BaseUrl || 'http://localhost:8080/fhir/',
      CqlOperation: configData?.FhirServer?.CqlOperation || '$cql'
    };
    this.CqlEndpoint = (configData?.FhirServer?.BaseUrl || 'http://localhost:8080/fhir/') + (configData?.FhirServer?.CqlOperation || '$cql');
    this.Debug = {
      QuickTest: configData?.Debug?.QuickTest || false
    };
    this.skipListMap = vi.fn().mockReturnValue(new Map());
    return this;
  })
}));

vi.mock('../src/conf/config-validator', () => ({
  ConfigValidator: vi.fn().mockImplementation(function(this: any) {
    this.validateConfig = vi.fn().mockImplementation((configData: any) => {
      const requiredFields = ['FhirServer', 'Build', 'Debug', 'Tests'];
      const hasRequiredFields = requiredFields.every(field => configData?.[field]);
      
      return hasRequiredFields 
        ? { isValid: true, errors: [] }
        : {
            isValid: false,
            errors: requiredFields.filter(field => !configData?.[field]).map(field => ({
              message: `must have required property '${field}' at #/required`,
              dataPath: '',
              schemaPath: ''
            }))
          };
    });
    this.formatErrors = vi.fn().mockImplementation((errors: any[]) => 
      errors.map((error: any, index: number) => `${index + 1}. ${error.message}`).join('\n')
    );
    return this;
  })
}));
vi.mock('../src/loaders/test-loader', () => ({ TestLoader: { load: vi.fn().mockReturnValue([]) } }));
vi.mock('../src/cql-engine/cql-engine', () => ({ 
  CQLEngine: vi.fn().mockImplementation(function(this: any) {
    this.apiUrl = 'http://localhost:8080/fhir/$cql';
    this.cqlVersion = '1.5';
    return this;
  })
}));
vi.mock('../src/shared/results-shared', () => ({
  generateEmptyResults: vi.fn().mockResolvedValue([]),
  generateParametersResource: vi.fn().mockReturnValue({})
}));
vi.mock('../src/test-results/cql-test-results', () => ({
  CQLTestResults: vi.fn().mockImplementation(function(this: any) {
    this.add = vi.fn();
    this.toJSON = vi.fn().mockReturnValue(createMockResults());
    return this;
  })
}));

// Mock fetch for HTTP requests
global.fetch = vi.fn().mockResolvedValue({
  status: 200,
  json: () => Promise.resolve(true)
});

describe('ServerCommand', () => {
  let serverCommand: ServerCommand;

  beforeEach(() => {
    serverCommand = new ServerCommand(0);
    vi.clearAllMocks();
  });

  describe('GET endpoints', () => {
    it('should return server information', async () => {
      const response = await request(serverCommand.app)
        .get('/')
        .expect(200);

      expect(response.body).toEqual({
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

    it('should return health status', async () => {
      const response = await request(serverCommand.app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /', () => {
    it('should handle valid configuration', async () => {
      const validConfig = createMockConfig();

      const response = await request(serverCommand.app)
        .post('/')
        .send(validConfig)
        .expect(200);

      expect(response.body).toHaveProperty('cqlengine');
      expect(response.body).toHaveProperty('testResultsSummary');
    });

    it('should handle missing configuration', async () => {
      const response = await request(serverCommand.app)
        .post('/')
        .send({})
        .expect(422);

      expect(response.body).toEqual({
        error: 'Unprocessable Entity',
        message: 'Configuration validation failed',
        details: '1. must have required property \'FhirServer\' at #/required\n2. must have required property \'Build\' at #/required\n3. must have required property \'Debug\' at #/required\n4. must have required property \'Tests\' at #/required'
      });
    });

    it('should handle invalid JSON', async () => {
      // Mock console.error to suppress error logging during this test
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      try {
        const response = await request(serverCommand.app)
          .post('/')
          .set('Content-Type', 'application/json')
          .send('invalid json')
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Internal server error');
      } finally {
        // Restore original console.error
        console.error = originalConsoleError;
      }
    });
  });

  describe('CORS', () => {
    const testCorsHeaders = (response: any) => {
      expect(response.headers['access-control-allow-origin']).toBe('*');
    };

    it('should include CORS headers', async () => {
      const response = await request(serverCommand.app)
        .get('/')
        .set('Origin', 'https://example.com')
        .expect(200);

      testCorsHeaders(response);
    });

    it('should handle preflight requests', async () => {
      const response = await request(serverCommand.app)
        .options('/')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      testCorsHeaders(response);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(serverCommand.app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Endpoint GET /nonexistent not found'
      });
    });
  });
});