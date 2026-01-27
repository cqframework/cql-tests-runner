import * as fs from 'fs';
import * as path from 'path';
import { CQLEngine } from '../cql-engine/cql-engine.js';
import { TestResult, InternalTestResult } from '../models/test-types.js';
import { TestResultsSummary, CQLTestResultsData } from '../models/results-types.js';
import { ResultsValidator } from '../conf/results-validator.js';

/**
 * Represents the results of running CQL tests.
 */
export class CQLTestResults {
	/**
	 * Object containing counts of test statuses.
	 */
	public counts: TestResultsSummary = {
		pass: 0,
		skip: 0,
		fail: 0,
		error: 0,
	};

	private _cqlengine: CQLEngine;
	private _testsRunDateTime: Date;
	public _testsRunDescription: string;
	/**
	 * Array containing CQLTestResult objects (internal type during execution).
	 */
	public results: InternalTestResult[] = [];

	/**
	 * Initializes CQLTestResults object with counts and results array.
	 * @param cqlengine - The CQL engine instance used to run the tests.
	 * @param testsRunDateTime - The date and time when the tests were run.
	 * @throws Error If cqlengine is not an instance of CQLEngine.
	 */
	constructor(
		cqlengine: CQLEngine,
		testsRunDateTime: Date | null = null,
		testsDescription: string | null = null
	) {
		if (!(cqlengine instanceof CQLEngine)) {
			throw new Error('Invalid CQLEngine Instance');
		}
		this._cqlengine = cqlengine;
		this._testsRunDateTime = testsRunDateTime || new Date();
		this._testsRunDescription = testsDescription || '';
	}

	/**
	 * Adds a test result to the counts and results array.
	 * @param result - The test result to add.
	 */
	add(result: InternalTestResult): void {
		const status = result.testStatus || 'skip';
		this.counts[status]++;
		this.results.push(result);
	}

	/**
	 * Displays the summary of test counts.
	 * @returns The counts object.
	 */
	summaryCount(): TestResultsSummary {
		console.log(
			`pass: ${this.counts.pass} skip: ${this.counts.skip} fail: ${this.counts.fail} error: ${this.counts.error}`
		);
		return this.counts;
	}

	/**
	 * Summarizes the test results and updates counts accordingly.
	 * @returns The counts object.
	 */
	summarize(): TestResultsSummary {
		this.counts = {
			pass: 0,
			skip: 0,
			fail: 0,
			error: 0,
		};

		for (const result of this.results) {
			const status = result.testStatus || 'skip';
			this.counts[status]++;
		}

		return this.summaryCount();
	}

	/**
	 * Converts CQLTestResults object to JSON format.
	 * @returns JSON representation of CQLTestResults (strictly schema-compliant).
	 */
	toJSON(): CQLTestResultsData {
		// Transform internal results to strict schema-compliant TestResult format
		const transformedResults: TestResult[] = this.results.map(result => {
			const transformed: TestResult = {
				// Required fields
				testsName: result.testsName,
				groupName: result.groupName,
				testName: result.testName,
				expression: result.expression,
				// Optional fields (only include if present)
				...(result.testStatus && { testStatus: result.testStatus }),
				...(result.responseStatus !== undefined && {
					responseStatus: result.responseStatus,
				}),
				...(result.actual !== undefined && { actual: String(result.actual) }),
				...(result.expected && { expected: result.expected }),
				...(result.error && {
					error: {
						message: result.error.message,
						...(result.error.name && { name: result.error.name }),
						...(result.error.stack && { stack: result.error.stack }),
					},
				}),
				...(result.invalid &&
					result.invalid !== 'undefined' && {
						invalid: result.invalid as 'false' | 'true' | 'semantic',
					}),
				...(result.capability &&
					result.capability.length > 0 && { capabilities: result.capability }),
			};
			return transformed;
		});

		return {
			cqlengine: this._cqlengine.toJSON(),
			testsRunDateTime: this._testsRunDateTime.toISOString(),
			testResultsSummary: {
				passCount: this.counts.pass,
				skipCount: this.counts.skip,
				failCount: this.counts.fail,
				errorCount: this.counts.error,
			},
			testsRunDescription: this._testsRunDescription || undefined,
			results: transformedResults,
		};
	}

	/**
	 * Formats a date into a string in the format yyyyMMddhhmm.
	 * @param date - The date to format.
	 * @returns The formatted date string.
	 */
	formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		return `${year}${month}${day}${hours}${minutes}`;
	}

	/**
	 * Saves the CQLTestResults object to a JSON file.
	 * @param outputPath - The directory path where the file will be saved.
	 * @param filename - The name of the file (without extension).
	 * @returns The path of the saved file.
	 */
	save(outputPath: string, filename: string | null = null): string {
		filename = filename || `${this.formatDate(new Date())}_results`;
		const fileName = `${filename}.json`;
		if (!fs.existsSync(outputPath)) {
			fs.mkdirSync(outputPath, { recursive: true });
		}
		const filePath = path.join(outputPath, fileName);
		fs.writeFileSync(filePath, JSON.stringify(this, null, 2));
		console.log(`Results saved to: ${filePath}`);
		return filePath;
	}

	/**
	 * Equalizes value types for comparison
	 */
	equalizeValueTypes(): void {
		for (const r of this.results) {
			const exp = r?.expected;
			const act = r?.actual;
			if (typeof act === 'boolean' && typeof exp === 'string') {
				r.actual = String(act);
			} else if (exp === 'null' && act === null) {
				r.actual = 'null';
			} else if (typeof exp === 'undefined' && act === undefined) {
				r.actual = undefined;
			} else if (typeof act === 'number' && typeof exp === 'string') {
				r.actual = String(act);
			} else if (act !== undefined && act !== null && typeof act !== 'string') {
				// Convert any non-string value to string for schema compliance
				r.actual = String(act);
			}
		}
	}

	/**
	 * Validates the CQLTestResults object against the JSON schema.
	 * @returns True if the object is valid, otherwise false.
	 */
	async validate(): Promise<boolean> {
		this.equalizeValueTypes();
		return await CQLTestResults.validateSchema(JSON.parse(JSON.stringify(this, null, 2)));
	}

	/**
	 * Validates a data object against the CQL test results schema.
	 * @param data - The data object to validate.
	 * @returns True if the data is valid, otherwise false.
	 */
	static async validateSchema(data: any): Promise<boolean> {
		// Use ResultsValidator for validation (eliminates code duplication)
		const validator = new ResultsValidator();
		const validation = validator.validateResults(data);

		if (validation.isValid) {
			// console.log('JSON is valid');
			return true;
		} else {
			// console.log('JSON is invalid:', validation.errors);
			return false;
		}
	}
}
