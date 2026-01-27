import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { ValidationError } from './config-validator.js';

export class ResultsValidator {
	private zodSchema: z.ZodTypeAny;

	constructor() {
		this.zodSchema = z.any(); // Temporary initialization
		this.loadSchema();
	}

	private loadSchema(): void {
		try {
			// Use import.meta.url for ES modules
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
			const schemaPath = path.join(
				__dirname,
				'../../assets/schema/cql-test-results.schema.json'
			);
			const schemaContent = fs.readFileSync(schemaPath, 'utf8');
			const jsonSchema = JSON.parse(schemaContent);
			// Convert JSON Schema to Zod schema at runtime
			this.zodSchema = convertJsonSchemaToZod(jsonSchema);
		} catch (error) {
			throw new Error(`Failed to load results schema: ${error}`);
		}
	}

	/**
	 * Validates a results object against the schema
	 * @param resultsData The results object to validate
	 * @returns Object containing validation result and any errors
	 */
	validateResults(resultsData: any): { isValid: boolean; errors: ValidationError[] } {
		const result = this.zodSchema.safeParse(resultsData);
		const isValid = result.success;

		const errors: ValidationError[] = [];
		if (!isValid && result.error) {
			errors.push(
				...result.error.issues.map((error: any) => ({
					message: error.message || 'Unknown validation error',
					dataPath: error.path.length > 0 ? '/' + error.path.join('/') : '',
					schemaPath: '',
					data: error.path.length > 0 ? this.getNestedValue(resultsData, error.path) : resultsData,
				}))
			);
		}

		return { isValid, errors };
	}

	private getNestedValue(obj: any, path: (string | number)[]): any {
		let current = obj;
		for (const key of path) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = current[key];
		}
		return current;
	}

	/**
	 * Validates a results file
	 * @param resultsPath Path to the results file
	 * @returns Object containing validation result and any errors
	 */
	validateResultsFile(resultsPath: string): { isValid: boolean; errors: ValidationError[] } {
		try {
			const fullPath = path.resolve(resultsPath);
			if (!fs.existsSync(fullPath)) {
				return {
					isValid: false,
					errors: [
						{
							message: `Results file not found: ${fullPath}`,
							dataPath: '',
							schemaPath: '',
							data: resultsPath,
						},
					],
				};
			}

			const resultsContent = fs.readFileSync(fullPath, 'utf8');
			const resultsData = JSON.parse(resultsContent);

			return this.validateResults(resultsData);
		} catch (error: any) {
			return {
				isValid: false,
				errors: [
					{
						message: `Error reading results file: ${error.message}`,
						dataPath: '',
						schemaPath: '',
						data: resultsPath,
					},
				],
			};
		}
	}

	/**
	 * Formats validation errors for display
	 * @param errors Array of validation errors
	 * @returns Formatted error string
	 */
	formatErrors(errors: ValidationError[]): string {
		if (errors.length === 0) {
			return 'No validation errors found.';
		}

		return errors
			.map((error, index) => {
				const location = error.dataPath ? ` at ${error.dataPath}` : '';
				return `${index + 1}. ${error.message}${location}`;
			})
			.join('\n');
	}
}
