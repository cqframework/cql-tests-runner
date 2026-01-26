// Author: Preston Lee

import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { JobStatus, JobRequest, JobResponse } from '../models/job-types.js';

export class JobManager {
	private jobsDir: string;

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
			createdAt: now,
		};

		// Store job request and status to file system
		const jobRequest: JobRequest = { config };
		await this.saveJobRequest(jobId, jobRequest);
		await this.saveJobStatus(jobId, jobStatus);

		return {
			jobId,
			status: 'pending',
			createdAt: now,
		};
	}

	public async getJobStatus(jobId: string): Promise<JobStatus | null> {
		// Always read from file system (no in-memory cache)
		return await this.loadJobStatus(jobId);
	}

	public async updateJobStatus(jobId: string, updates: Partial<JobStatus>): Promise<void> {
		// Load current status from file system
		const currentStatus = await this.loadJobStatus(jobId);
		if (!currentStatus) {
			throw new Error(`Job ${jobId} not found`);
		}

		const updatedStatus: JobStatus = {
			...currentStatus,
			...updates,
		};

		await this.saveJobStatus(jobId, updatedStatus);
	}

	public async startJob(jobId: string): Promise<void> {
		await this.setJobStatus(jobId, 'running', { startedAt: new Date().toISOString() });
	}

	public async completeJob(jobId: string, results: any): Promise<void> {
		await this.setJobStatus(jobId, 'completed', {
			completedAt: new Date().toISOString(),
			results,
		});
	}

	public async failJob(jobId: string, error: string): Promise<void> {
		await this.setJobStatus(jobId, 'failed', {
			completedAt: new Date().toISOString(),
			error,
		});
	}

	private async setJobStatus(
		jobId: string,
		status: JobStatus['status'],
		additionalData: Partial<JobStatus> = {}
	): Promise<void> {
		await this.updateJobStatus(jobId, {
			status,
			...additionalData,
		});
	}

	public async updateJobProgress(
		jobId: string,
		current: number,
		total: number,
		message?: string
	): Promise<void> {
		await this.updateJobStatus(jobId, {
			progress: { current, total, message },
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

		// Read all job files from the file system
		try {
			const files = await fs.readdir(this.jobsDir);
			const statusFiles = files.filter(f => f.endsWith('.status.json'));

			for (const file of statusFiles) {
				try {
					const jobId = file.replace('.status.json', '');
					const status = await this.loadJobStatus(jobId);
					
					if (status) {
						const createdAt = new Date(status.createdAt);
						if (createdAt < cutoffTime) {
							await this.deleteJobFiles(jobId);
						}
					}
				} catch (error) {
					// Skip files that can't be read or parsed
					console.warn(`Failed to process job file ${file}:`, error);
				}
			}
		} catch (error) {
			console.error('Error reading jobs directory:', error);
		}
	}

	private async deleteJobFiles(jobId: string): Promise<void> {
		const fileTypes = ['request', 'status'];
		await Promise.allSettled(
			fileTypes.map(type => fs.unlink(join(this.jobsDir, `${jobId}.${type}.json`)))
		);
	}
}
