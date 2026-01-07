// Author: Preston Lee

import { JobManager } from './job-manager.js';
import { TestRunner } from '../services/test-runner.js';

export class JobProcessor {
  private jobManager: JobManager;
  private testRunner: TestRunner;

  constructor(jobManager: JobManager) {
    this.jobManager = jobManager;
    this.testRunner = new TestRunner();
  }

  public async processJob(jobId: string): Promise<void> {
    try {
      await this.jobManager.startJob(jobId);

      // Get the job request
      const jobStatus = await this.jobManager.getJobStatus(jobId);
      if (!jobStatus) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Load the job request from file
      const jobRequest = await this.loadJobRequest(jobId);
      if (!jobRequest) {
        throw new Error(`Job request for ${jobId} not found`);
      }

      // Process the tests using the shared TestRunner
      const results = await this.testRunner.runTests(jobRequest.config, {
        onProgress: async (current, total, message) => {
          await this.jobManager.updateJobProgress(jobId, current, total, message);
        }
      });
      
      // Complete the job with the JSON representation of results
      await this.jobManager.completeJob(jobId, results.toJSON());

    } catch (error: any) {
      console.error(`Error processing job ${jobId}:`, error);
      await this.jobManager.failJob(jobId, error.message);
    }
  }

  private async loadJobRequest(jobId: string): Promise<any> {
    const { promises: fs } = await import('fs');
    const { join } = await import('path');
    
    try {
      const filePath = join('./jobs', `${jobId}.request.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}
