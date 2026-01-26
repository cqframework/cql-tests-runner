import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { JobManager } from '../jobs/job-manager.js';
import { JobProcessor } from '../jobs/job-processor.js';
import { setupMcpServer } from '../server/mcp-server-setup.js';
import { setupRestRoutes } from '../server/rest-routes.js';
import { TestExecutionService } from '../server/test-execution-service.js';

export class ServerCommand {
  private _app: express.Application;
  private _server: Server | null = null;
  private port: number;
  private jobManager: JobManager;
  private jobProcessor: JobProcessor;
  private mcpServer: McpServer;
  private mcpTransport: StreamableHTTPServerTransport;
  private testExecutionService: TestExecutionService;

  constructor(port: number = 3000) {
    this.port = port;
    this._app = express();
    this.jobManager = new JobManager('./jobs');
    this.jobProcessor = new JobProcessor(this.jobManager);
    this.testExecutionService = new TestExecutionService();
    this.mcpServer = new McpServer({
      name: 'cql-tests-runner',
      version: '1.4.0',
    });
    this.mcpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode for multi-instance support
    });
    this.setupMiddleware();
    this.setupMcpServer();
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
    this._app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: false,
      })
    );

    // Error handling middleware
    this._app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  private setupMcpServer(): void {
    setupMcpServer({
      mcpServer: this.mcpServer,
      mcpTransport: this.mcpTransport,
      testExecutionService: this.testExecutionService,
      jobManager: this.jobManager,
      jobProcessor: this.jobProcessor,
    });
  }

  private setupRoutes(): void {
    setupRestRoutes({
      app: this._app,
      testExecutionService: this.testExecutionService,
      jobManager: this.jobManager,
      jobProcessor: this.jobProcessor,
      mcpTransport: this.mcpTransport,
    });
  }

  private setupSignalHandlers(): void {
    // Handle SIGINT (CTRL-C) and SIGTERM signals
    let isShuttingDown = false;
    const gracefulShutdown = (signal: string) => {
      if (isShuttingDown) {
        // Force exit if already shutting down
        console.log('Force exiting...');
        process.exit(1);
        return;
      }
      isShuttingDown = true;
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
      this.stop();
      
      // Force exit after 5 seconds if graceful shutdown doesn't complete
      setTimeout(() => {
        console.log('Graceful shutdown timeout, forcing exit...');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._server = this._app.listen(this.port, '0.0.0.0', () => {
        console.log(`CQL Tests Runner server listening on port ${this.port}`);
        console.log(`Server running at http://0.0.0.0:${this.port}`);
        console.log('Send POST requests with configuration to run tests');
        console.log('Press CTRL-C to stop the server');
        resolve();
      });

      this._server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Error: Port ${this.port} is already in use`);
          reject(new Error(`Port ${this.port} is already in use`));
        } else if (error.code === 'EACCES') {
          console.error(`Error: Permission denied to bind to port ${this.port}`);
          reject(new Error(`Permission denied to bind to port ${this.port}`));
        } else {
          console.error(`Error starting server: ${error.message}`);
          reject(error);
        }
      });
    });
  }

  public stop(): void {
    if (this._server) {
      console.log('Shutting down server...');
      
      // Close all active connections immediately (if available)
      if (typeof (this._server as any).closeAllConnections === 'function') {
        (this._server as any).closeAllConnections();
      }
      
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
      
      // If close() doesn't complete within 2 seconds, force close
      setTimeout(() => {
        if (this._server) {
          console.log('Forcing server close...');
          if (typeof (this._server as any).closeAllConnections === 'function') {
            (this._server as any).closeAllConnections();
          }
          this._server.close(() => {
            process.exit(0);
          });
        }
      }, 2000);
    } else {
      console.log('Server is not running');
      process.exit(0);
    }
  }
}
