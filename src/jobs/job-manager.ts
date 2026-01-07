// Author: Preston Lee

import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { JobStatus, JobRequest, JobResponse } from '../models/job-types.js';

export class JobManager {
  private jobsDir: string;
  private activeJobs: Map<string, JobStatus> = new Map();

  constructor(jobsDir: string = './jobs') {
    this.jobsDir = jobsDir;
    this.ensureJobsDirectory();
  }

  private async ensureJobsDirectory(): Promise<void> {
    try {
      await fs.access(this.jobsDir);
    } catch {
      await fs.mkdir(this.jobsDir, { recursive: true });
    }
  }

  public async createJob(config: any): Promise<JobResponse> {
    const jobId = uuidv4();
    const now = new Date().toISOString();
    
    const jobStatus: JobStatus = {
      id: jobId,
      status: 'pending',
      createdAt: now
    };

    // Store in memory for quick access
    this.activeJobs.set(jobId, jobStatus);

    // Store job request to file
    const jobRequest: JobRequest = { config };
    await this.saveJobRequest(jobId, jobRequest);

    return {
      jobId,
      status: 'pending',
      createdAt: now
    };
  }

  public async getJobStatus(jobId: string): Promise<JobStatus | null> {
    // First check in-memory cache
    let jobStatus = this.activeJobs.get(jobId);
    
    if (!jobStatus) {
      // Try to load from file
      const loadedStatus = await this.loadJobStatus(jobId);
      if (loadedStatus) {
        jobStatus = loadedStatus;
        this.activeJobs.set(jobId, jobStatus);
      }
    }

    return jobStatus || null;
  }

  public async updateJobStatus(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    const currentStatus = this.activeJobs.get(jobId);
    if (!currentStatus) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedStatus: JobStatus = {
      ...currentStatus,
      ...updates
    };

    this.activeJobs.set(jobId, updatedStatus);
    await this.saveJobStatus(jobId, updatedStatus);
  }

  public async startJob(jobId: string): Promise<void> {
    await this.setJobStatus(jobId, 'running', { startedAt: new Date().toISOString() });
  }

  public async completeJob(jobId: string, results: any): Promise<void> {
    await this.setJobStatus(jobId, 'completed', { 
      completedAt: new Date().toISOString(),
      results 
    });
  }

  public async failJob(jobId: string, error: string): Promise<void> {
    await this.setJobStatus(jobId, 'failed', { 
      completedAt: new Date().toISOString(),
      error 
    });
  }

  private async setJobStatus(jobId: string, status: JobStatus['status'], additionalData: Partial<JobStatus> = {}): Promise<void> {
    await this.updateJobStatus(jobId, {
      status,
      ...additionalData
    });
  }

  public async updateJobProgress(jobId: string, current: number, total: number, message?: string): Promise<void> {
    await this.updateJobStatus(jobId, {
      progress: { current, total, message }
    });
  }

  private async saveJobRequest(jobId: string, request: JobRequest): Promise<void> {
    await this.saveJobFile(jobId, 'request', request);
  }

  private async saveJobStatus(jobId: string, status: JobStatus): Promise<void> {
    await this.saveJobFile(jobId, 'status', status);
  }

  private async loadJobStatus(jobId: string): Promise<JobStatus | null> {
    return await this.loadJobFile<JobStatus>(jobId, 'status');
  }

  private async saveJobFile<T>(jobId: string, type: string, data: T): Promise<void> {
    const filePath = join(this.jobsDir, `${jobId}.${type}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  private async loadJobFile<T>(jobId: string, type: string): Promise<T | null> {
    try {
      const filePath = join(this.jobsDir, `${jobId}.${type}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public async cleanupOldJobs(maxAgeHours: number = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [jobId, status] of this.activeJobs.entries()) {
      const createdAt = new Date(status.createdAt);
      if (createdAt < cutoffTime) {
        this.activeJobs.delete(jobId);
        await this.deleteJobFiles(jobId);
      }
    }
  }

  private async deleteJobFiles(jobId: string): Promise<void> {
    const fileTypes = ['request', 'status'];
    await Promise.allSettled(
      fileTypes.map(type => 
        fs.unlink(join(this.jobsDir, `${jobId}.${type}.json`))
      )
    );
  }
}
