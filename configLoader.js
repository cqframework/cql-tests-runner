// configLoader.js
const config = require('config');

class ConfigLoader {
    
    constructor() {
        console.log(process.env.NODE_ENV)

        const baseURL = process.env.SERVER_BASE_URL || config.get('FhirServer.BaseUrl') || 'https://cloud.alphora.com/sandbox/r4/cds/fhir';

        this.FhirServer = {
            BaseUrl: this.#removeTrailingSlash(baseURL),
            CqlOperation: process.env.CQL_OPERATION || config.get('FhirServer.CqlOperation') || '$cql'
        };
        this.Build = {
            CqlFileVersion: process.env.CQL_FILE_VERSION || config.get('Build.CqlFileVersion') || '1.0.000',
            CqlOutputPath: process.env.CQL_OUTPUT_PATH || config.get('Build.CqlOutputPath') || './cql'

        }
        this.Tests = {
            ResultsPath: process.env.RESULTS_PATH || config.get('Tests.ResultsPath') || './results',
            SkipList: process.env.SKIP_LIST || config.get('Tests.SkipList') || [],
            IgnoreTimeZone: process.env.IGNORE_TIME_ZONE || config.get('Tests.IgnoreTimeZone') || true
        };
        this.Debug = {
            QuickTest: this.#setQuickTestSetting()
        };

        this.CqlEndpoint = this.#cqlEndPoint();

    }
    // TODO: validate the config values
    #removeTrailingSlash(url) {
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }

    #cqlEndPoint(){
        if (this.FhirServer.CqlOperation === '$cql') {
            return '$cql';
        }
        else {
            return 'Library' + '/$evaluate';
        }
    }

    get apiUrl() {
        if (this.FhirServer.CqlOperation === '$cql') {
            return this.FhirServer.BaseUrl + '/$cql';
        }
        else {
            return this.FhirServer.BaseUrl + '/Library' + '/$evaluate';
        }
    }

    #setQuickTestSetting() {
        if (process.env.QUICK_TEST !== undefined) {
            return process.env.QUICK_TEST === 'true';
        }

        const configValue = config.get('Debug.QuickTest');
        if (configValue !== undefined) {
            return configValue;
        }

        return true;
    }

    #setIgnoreTimeZoneSetting() {
        if (process.env.IGNORE_TIME_ZONE !== undefined) {
            return process.env.IGNORE_TIME_ZONE === 'true';
        }

        const configValue = config.get('Tests.IgnoreTimeZone');
        if (configValue !== undefined) {
            return configValue;
        }

        return false;
    }

    skipListMap() {
        const skipList = this.Tests.SkipList;
        const skipMap = new Map(
            skipList.map(skipItem => [
                `${skipItem.testsName}-${skipItem.groupName}-${skipItem.testName}`,
                skipItem.reason
            ])
        );
        return skipMap
    }
}

module.exports = ConfigLoader;
