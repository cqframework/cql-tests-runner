export interface ConnectivityResult {
	isAccessible: boolean;
	error?: string;
}

export class ServerConnectivityError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'ServerConnectivityError';
	}
}

export class ServerConnectivity {
	private static getVersion(): string {
		try {
			// Use dynamic import for ES modules
			const fs = require('fs');
			const path = require('path');
			const packageJson = JSON.parse(
				fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
			);
			return packageJson.version || '1.0.0';
		} catch {
			return '1.0.0'; // fallback version
		}
	}

	/**
	 * Verifies that a server is accessible by making a simple GET request
	 * @param serverBaseUrl The base URL of the server to check
	 * @throws ServerConnectivityError if the server is not accessible
	 */
	public static async verifyServerConnectivity(serverBaseUrl: string): Promise<void> {
		try {
			// First, try to reach the base URL with a simple GET request
			const response = await fetch(serverBaseUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'User-Agent': `CQL-Tests-Runner/${this.getVersion()}`,
				},
				// Set a reasonable timeout (10 seconds)
				signal: AbortSignal.timeout(10000),
			});

			// Check if we get any response (even 404 is better than no connection)
			if (response.status >= 200 && response.status < 600) {
				return; // Server is accessible
			} else {
				throw new ServerConnectivityError(
					`Server returned unexpected status: ${response.status} ${response.statusText}`,
					'INVALID_STATUS'
				);
			}
		} catch (error: any) {
			// Handle different types of connection errors
			if (error.name === 'AbortError') {
				throw new ServerConnectivityError(
					'Connection timeout - server did not respond within 10 seconds',
					'TIMEOUT',
					error
				);
			} else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
				throw new ServerConnectivityError(
					`Cannot connect to server at ${serverBaseUrl} - server may be down or URL may be incorrect`,
					'CONNECTION_REFUSED',
					error
				);
			} else if (error.code === 'ECONNRESET') {
				throw new ServerConnectivityError(
					'Connection was reset by the server',
					'CONNECTION_RESET',
					error
				);
			} else {
				throw new ServerConnectivityError(
					`Connection failed: ${error.message}`,
					'UNKNOWN_ERROR',
					error
				);
			}
		}
	}
}
