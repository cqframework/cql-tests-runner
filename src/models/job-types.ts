// Author: Preston Lee

export interface JobStatus {
	id: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	error?: string;
	results?: any;
	progress?: {
		current: number;
		total: number;
		message?: string;
	};
}

export interface JobRequest {
	config: any;
}

export interface JobResponse {
	jobId: string;
	status: 'pending';
	createdAt: string;
}
