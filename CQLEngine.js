const axios = require('axios');

/**
 * Represents a CQL Engine.
 */
class CQLEngine {
    /**
     * List of supported CQL engine versions.
     * @type {string[]}
     */
    static engineVersions = [
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
     * Creates an instance of CQLEngine.
     * @param {string} baseURL - The base URL for the CQL engine.
     * @param {string|null} [cqlPath=null] - The path for the CQL engine (optional).
     */
    constructor(baseURL, cqlPath = null) {
        /**
         * Object containing CQL information.
         * @type {Object}
         */
        this.info = {};
        this._prepareBaseURL(baseURL, cqlPath);
    }

    /**
     * Prepares the base URL.
     * @param {string} baseURL - The base URL for the CQL engine.
     * @param {string|null} cqlPath - The path for the CQL engine (optional).
     * @private
     */
    _prepareBaseURL(baseURL, cqlPath) {
        if (baseURL) {
            // Remove trailing slash if it exists
            if (baseURL.endsWith('/')) {
                baseURL = baseURL.slice(0, -1);
            }

            if (baseURL.endsWith('/$cql')) {
                // If the path ends with '/$cql', set apiUrl and remove '/$cql' from baseURL
                this.apiUrl = baseURL;
                this.baseURL = baseURL.replace('/$cql', '');
            } else {
                this.baseURL = baseURL;
                if (cqlPath) {
                    this.apiUrl = `${baseURL}/${cqlPath}`;
                } else {
                    this.apiUrl = baseURL;
                }
            }

        } else {
            throw new Error(`API URL is missing !!`);
        }
    }

    /**
     * Fetches metadata from the CQL engine.
     * @param {boolean} [force=false] - Whether to force fetching metadata.
     * @returns {Promise<void>} - A Promise that resolves when metadata is fetched.
     */
    async fetch(force = false) {
        if (this.baseURL) {
            if (!this.metadata || force) {
                try {
                    let response = await axios.get(`${this.baseURL}/metadata`);
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
     * @param {string} apiUrl - The API URL.
     */
    set apiUrl(apiUrl) {
        this.info['apiUrl'] = apiUrl;
    }

    /**
     * Gets the API URL.
     * @returns {string|null} - The API URL.
     */
    get apiUrl() {
        return this.info?.apiUrl ?? null;
    }

    /**
     * Sets the CQL version.
     * @param {string} version - The CQL version.
     */
    set cqlVersion(version) {
        this.info['cqlVersion'] = version;
    }

    /**
     * Gets the CQL version.
     * @returns {string|null} - The CQL version.
     */
    get cqlVersion() {
        return this.info?.cqlVersion ?? null;
    }

    /**
     * Sets the CQL translator.
     * @param {string} translator - The CQL translator.
     */
    set cqlTranslator(translator) {
        this.info['cqlTranslator'] = translator;
    }

    /**
     * Gets the CQL translator.
     * @returns {string|null} - The CQL translator.
     */
    get cqlTranslator() {
        return this.info?.cqlTranslator ?? null;
    }

    /**
     * Sets the CQL translator version.
     * @param {string} version - The CQL translator version.
     */
    set cqlTranslatorVersion(version) {
        this.info['cqlTranslatorVersion'] = version;
    }

    /**
     * Gets the CQL translator version.
     * @returns {string|null} - The CQL translator version.
     */
    get cqlTranslatorVersion() {
        return this.info?.cqlTranslatorVersion ?? null;
    }

    /**
     * Sets the CQL engine.
     * @param {string} engine - The CQL engine.
     */
    set cqlEngine(engine) {
        this.info['cqlEngine'] = engine;
    }

    /**
     * Gets the CQL engine.
     * @returns {string|null} - The CQL engine.
     */
    get cqlEngine() {
        return this.info?.cqlEngine ?? null;
    }

    /**
     * Sets the CQL engine version.
     * @param {string} version - The CQL engine version.
     * @throws {Error} - If the version is not valid.
     */
    set cqlEngineVersion(version) {
        if (version) {
            if (CQLEngine.engineVersions.includes(version)) {
                this.info['cqlEngineVersion'] = version;
            } else {
                throw new Error(`Not a valid CQL Engine version !!`);
            }
        }
    }

    /**
     * Gets the CQL engine version.
     * @returns {string|null} - The CQL engine version.
     */
    get cqlEngineVersion() {
        return this.info?.cqlEngineVersion ?? null;
    }

    /**
     * Converts the CQLEngine object to JSON.
     * @returns {Object} - The JSON representation of the CQLEngine object.
     */
    toJSON() {
        return this.info;
    }

    /**
     * Creates a CQLEngine instance from a JSON object.
     * @param {Object} cqlInfo - The JSON object containing CQL information.
     * @returns {CQLEngine} - The CQLEngine instance.
     */
    static fromJSON(cqlInfo) {
        let engine = new CQLEngine(cqlInfo.apiUrl);
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
        return engine;
    }
}

module.exports = CQLEngine;
