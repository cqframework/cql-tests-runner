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
      testsRunDescription: process.env.TESTS_RUN_DESCRIPTION || configData.Build?.testsRunDescription || 'No configuration provided',
	  cqlTranslator: process.env.CQL_TRANSLATOR || configData.Build?.cqlTranslator || 'No configuration provided',
	  cqlTranslatorVersion: process.env.CQL_TRANSLATOR_VERSION || configData.Build?.cqlTranslatorVersion || 'No configuration provided',
	  cqlEngine: process.env.CQL_ENGINE || configData.Build?.cqlEngine || 'No configuration provided',
	  cqlEngineVersion: process.env.CQL_ENGINE_VERSION || configData.Build?.cqlEngineVersion || 'No configuration provided',
	  SERVER_OFFSET_ISO: process.env.SERVER_OFFSET_ISO || configData.Build?.SERVER_OFFSET_ISO || '+00:00',
	  TimeZoneOffsetPolicy: process.env.TIME_ZONE_OFFSET_POLICY || configData.Build?.TimeZoneOffsetPolicy || '',
  };

  config.Tests = {
    ResultsPath: process.env.RESULTS_PATH || configData.Tests?.ResultsPath || './results',
    SkipList: (() => {
      const env = process.env.SKIP_LIST;
      if (env !== undefined) {
        try {
          const parsed = JSON.parse(env);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          console.warn(
            'Failed to parse SKIP_LIST environment variable. Falling back to SkipList in config file.'
          );
        }
      }
      return configData.Tests?.SkipList || [];
    })(),
    OnlyList: (() => {
      const env = process.env.ONLY_LIST;
      if (env !== undefined) {
        try {
          const parsed = JSON.parse(env);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          console.warn(
            'Failed to parse ONLY_LIST environment variable. Falling back to OnlyList in config file.'
          );
        }
      }
      return configData.Tests?.OnlyList || [];
    })()
  };

  config.Debug = {
    QuickTest: setQuickTestSetting(configData)
  };

  config.CqlEndpoint = cqlEndPoint(config.FhirServer.CqlOperation);

  return config;
}
