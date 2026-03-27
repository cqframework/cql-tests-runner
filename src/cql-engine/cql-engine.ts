import axios, { AxiosResponse } from 'axios';
import { CQLEngineInfo } from '../models/results-types.js';
import { response } from 'express';

/**
 * Represents a CQL Engine.
 */
export class CQLEngine {
	/**
	 * List of supported CQL engine versions.
	 */
	static engineVersions: string[] = [
		'1.4',
		'1.5',
		'1.5.0',
		'1.5.1',
		'1.5.2',
		'1.5.3',
		'1.5.4',
		'1.5.5',
		'1.5.6',
		'1.5.7',
		'1.5.8',
		'1.5.9',
		'1.5.10',
		'1.5.N',
		'2.0.0',
		'2.1.0',
		'2.2.0',
		'2.3.0',
		'2.4.0'
	];

	/**
	 * List of supported CQL versions.
	 */
	static cqlVersion: string[] = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5'];

	private info: Partial<CQLEngineInfo> = {};
	private baseURL?: string;
	private metadata?: any;
	private description?: string;
	private _SERVER_OFFSET_ISO?: string;

	/**
	 * Creates a new CQLEngine instance.
	 *
	 * @param baseURL Base URL of the FHIR server (e.g. http://localhost:8080/fhir/$cql)
	 * @param cqlPath Optional path to local CQL files
	 * @param cqlTranslator Name of the CQL translator
	 * @param cqlTranslatorVersion Version of the CQL translator
	 * @param cqlEngine Name of the CQL engine
	 * @param cqlEngineVersion Version of the CQL engine
	 * @param SERVER_OFFSET_ISO Timezone offset used by the server (e.g. "+00:00", "-06:00")
	 */	constructor(
		baseURL: string,
		cqlPath: string | null = null,
		cqlTranslator: string = '',
		cqlTranslatorVersion: string = '',
		cqlEngine: string = '',
		cqlEngineVersion: string = '',
		SERVER_OFFSET_ISO: string = ''
	) {
		this._prepareBaseURL(baseURL, cqlPath);
		this._setInformationFields(
			cqlTranslator,
			cqlTranslatorVersion,
			cqlEngine,
			cqlEngineVersion
		);
		this.SERVER_OFFSET_ISO = SERVER_OFFSET_ISO;
	}

	/**
	 * Prepares the base URL.
	 * @param baseURL - The base URL for the CQL engine.
	 * @param cqlPath - The path for the CQL engine (optional).
	 * @private
	 */
	private _prepareBaseURL(baseURL: string, cqlPath: string | null): void {
		if (baseURL) {
			// Remove trailing slash if it exists
			if (baseURL.endsWith('/')) {
				baseURL = baseURL.slice(0, -1);
			}

			if (baseURL.endsWith('/$cql')) {
				// If the path ends with '/$cql', set apiUrl and remove '/$cql' from baseURL
				this.info.apiUrl = baseURL;
				this.baseURL = baseURL.replace('/$cql', '');
			} else {
				this.baseURL = baseURL;
				if (cqlPath) {
					this.info.apiUrl = `${baseURL}/${cqlPath}`;
				} else {
					this.info.apiUrl = baseURL;
				}
			}
		} else {
			throw new Error(`API URL is missing !!`);
		}
	}

  private _setInformationFields(cqlTranslator: string, cqlTranslatorVersion: string,
                                     cqlEngine: string, cqlEngineVersion: string)
  {
		this.info.cqlTranslator = cqlTranslator;
		this.info.cqlTranslatorVersion = cqlTranslatorVersion;
		this.info.cqlEngine = cqlEngine;
		this.info.cqlEngineVersion = cqlEngineVersion;
	}

	/**
	 * Fetches metadata from the CQL engine.
	 * @param force - Whether to force fetching metadata.
	 * @returns A Promise that resolves when metadata is fetched.
	 */
	async fetch(force: boolean = false): Promise<void> {
		if (this.baseURL) {
			if (!this.metadata || force) {
				try {
					const response: AxiosResponse = await axios.get(`${this.baseURL}/metadata`);
					if (response?.data) {
						this.metadata = response.data;
					}
				} catch (e) {
					console.error(e);
				}
			}
		}
	}

	/**
	 * Sets the API URL.
	 * @param apiUrl - The API URL.
	 */
	set apiUrl(apiUrl: string) {
		this.info['apiUrl'] = apiUrl;
	}

	/**
	 * Gets the API URL.
	 * @returns The API URL.
	 */
	get apiUrl(): string | null {
		return this.info?.apiUrl ?? null;
	}

	/**
	 * Sets the CQL version.
	 * @param version - The CQL version.
	 */
	set cqlVersion(version: string) {
		this.info['cqlVersion'] = version;
	}

	/**
	 * Gets the CQL version.
	 * @returns The CQL version.
	 */
	get cqlVersion(): string | null {
		return this.info?.cqlVersion ?? null;
	}

	/**
	 * Sets the CQL translator.
	 * @param translator - The CQL translator.
	 */
	set cqlTranslator(translator: string) {
		this.info['cqlTranslator'] = translator ?? null;
	}

	/**
	 * Gets the CQL translator.
	 * @returns The CQL translator.
	 */
	get cqlTranslator(): string | null {
		return this.info?.cqlTranslator ?? null;
	}

	/**
	 * Sets the CQL translator version.
	 * @param version - The CQL translator version.
	 */
	set cqlTranslatorVersion(version: string) {
		this.info['cqlTranslatorVersion'] = version ?? null;
	}

	/**
	 * Gets the CQL translator version.
	 * @returns The CQL translator version.
	 */
	get cqlTranslatorVersion(): string | null {
		return this.info?.cqlTranslatorVersion ?? null;
	}

	/**
	 * Sets the CQL engine.
	 * @param engine - The CQL engine.
	 */
	set cqlEngine(engine: string) {
		this.info['cqlEngine'] = engine ?? null;
	}

	/**
	 * Gets the CQL engine.
	 * @returns The CQL engine.
	 */
	get cqlEngine(): string | null {
		return this.info?.cqlEngine ?? null;
	}

	/**
	 * Sets the CQL engine version.
	 * @param version - The CQL engine version.
	 */
	set cqlEngineVersion(version: string) {
		this.info['cqlEngineVersion'] = version ?? null;
	}

	/**
	 * Gets the CQL engine version.
	 * @returns The CQL engine version.
	 */
	get cqlEngineVersion(): string | null {
		return this.info?.cqlEngineVersion ?? null;
	}

	get SERVER_OFFSET_ISO(): string {
		return <string>this._SERVER_OFFSET_ISO;
	}

	set SERVER_OFFSET_ISO(value: string) {
		this._SERVER_OFFSET_ISO = value;
	}

	/**
	 * Converts the CQLEngine object to JSON.
	 * @returns The JSON representation of the CQLEngine object.
	 */
	toJSON(): CQLEngineInfo {
		// Ensure all required fields are present with defaults if missing
		return {
			apiUrl: this.info.apiUrl || '',
			description: this.info.description || '',
			cqlVersion: this.info.cqlVersion || '',
			cqlTranslator: this.info.cqlTranslator || '',
			cqlTranslatorVersion: this.info.cqlTranslatorVersion || '',
			cqlEngine: this.info.cqlEngine || '',
			cqlEngineVersion: this.info.cqlEngineVersion || '',
			SERVER_OFFSET_ISO: this.SERVER_OFFSET_ISO || '',
		};
	}

	/**
	 * Creates a CQLEngine instance from a JSON object.
	 * @param cqlInfo - The JSON object containing CQL information.
	 * @returns The CQLEngine instance.
	 */
	static fromJSON(cqlInfo: CQLEngineInfo): CQLEngine {
		const engine = new CQLEngine(
			cqlInfo.apiUrl || '',
			null,
			cqlInfo.cqlTranslator,
			cqlInfo.cqlTranslatorVersion,
			cqlInfo.cqlEngine,
			cqlInfo.cqlEngineVersion,
			cqlInfo.SERVER_OFFSET_ISO
		);
		if (cqlInfo?.cqlVersion) {
			engine.cqlVersion = cqlInfo.cqlVersion;
		}
		if (cqlInfo?.cqlTranslator) {
			engine.cqlTranslator = cqlInfo.cqlTranslator;
		}
		if (cqlInfo?.cqlTranslatorVersion) {
			engine.cqlTranslatorVersion = cqlInfo.cqlTranslatorVersion;
		}
		if (cqlInfo?.cqlEngine) {
			engine.cqlEngine = cqlInfo.cqlEngine;
		}
		if (cqlInfo?.cqlEngineVersion) {
			engine.cqlEngineVersion = cqlInfo.cqlEngineVersion;
		}
		if (cqlInfo?.SERVER_OFFSET_ISO) {
			engine._SERVER_OFFSET_ISO = cqlInfo.SERVER_OFFSET_ISO;
		}
		return engine;
	}
}
