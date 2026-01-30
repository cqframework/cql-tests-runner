import { ConfigLoader } from '../conf/config-loader.js';

/**
 * Removes trailing slash from a URL string
 */
export function removeTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Gets the CQL endpoint based on the operation type
 */
export function cqlEndPoint(cqlOperation: string): string {
  if (cqlOperation === '$cql') {
    return '$cql';
  } else {
    return 'Library' + '/$evaluate';
  }
}

/**
 * Sets the QuickTest setting from environment or config
 */
export function setQuickTestSetting(configData: any): boolean {
  if (process.env.QUICK_TEST !== undefined) {
    return process.env.QUICK_TEST === 'true';
  }

  const configValue = configData.Debug?.QuickTest;
  if (configValue !== undefined) {
    return configValue as boolean;
  }

  return true;
}

/**
 * Creates a ConfigLoader instance from configuration data
 */
export function createConfigFromData(configData: any): ConfigLoader {
  // Create a temporary config loader without validation (we already validated)
  const config = new ConfigLoader(undefined, false);

  // Manually populate the config from the provided data
  const baseURL = process.env.SERVER_BASE_URL || configData.FhirServer?.BaseUrl || 'https://cloud.alphora.com/sandbox/r4/cds/fhir';

  config.FhirServer = {
    BaseUrl: removeTrailingSlash(baseURL),
    CqlOperation: process.env.CQL_OPERATION || configData.FhirServer?.CqlOperation || '$cql'
  };

  config.Build = {
      CqlFileVersion: process.env.CQL_FILE_VERSION || configData.Build?.CqlFileVersion || '1.0.000',
      CqlOutputPath: process.env.CQL_OUTPUT_PATH || configData.Build?.CqlOutputPath || './cql',
      CqlVersion: process.env.CQL_VERSION || configData.Build?.CqlVersion,
      testsRunDescription: process.env.TESTS_RUN_DESCRIPTION || configData.Build?.testsRunDescription || '',
	  cqlTranslator: process.env.CQL_TRANSLATOR || configData.Build?.cqlTranslator || '',
	  cqlTranslatorVersion: process.env.CQL_TRANSLATOR_VERSION || configData.Build?.cqlTranslatorVersion || '',
	  cqlEngine: process.env.CQL_ENGINE || configData.Build?.cqlEngine || 'Unknown',
	  cqlEngineVersion: process.env.CQL_ENGINE_VERSION || configData.Build?.cqlEngineVersion || 'Unknown'
  };

  config.Tests = {
    ResultsPath: process.env.RESULTS_PATH || configData.Tests?.ResultsPath || './results',
    SkipList: process.env.SKIP_LIST || configData.Tests?.SkipList || []
  };

  config.Debug = {
    QuickTest: setQuickTestSetting(configData)
  };

  config.CqlEndpoint = cqlEndPoint(config.FhirServer.CqlOperation);

  return config;
}
