import * as fs from 'fs';
import * as path from 'path';
import { Config, SkipItem } from '../models/config-types.js';
import { ConfigValidator, ValidationError } from './config-validator.js';

export class ConfigLoader implements Config {
  FhirServer: {
    BaseUrl: string;
    CqlOperation: string;
  };
  Build: {
    CqlFileVersion: string;
    CqlOutputPath: string;
    CqlVersion?: string;
    testsRunDescription: string;
  };
  Tests: {
    ResultsPath: string;
    SkipList: SkipItem[];
  };
  Debug: {
    QuickTest: boolean;
  };
  CqlEndpoint: string;

  constructor(configPath?: string, validateConfig: boolean = true) {
    const configData = this.#loadConfig(configPath);
    
    // Validate configuration if a path was provided and validation is enabled
    if (configPath && validateConfig) {
      this.#validateConfig(configPath, configData);
    }

    const baseURL = process.env.SERVER_BASE_URL || configData.FhirServer?.BaseUrl || 'https://cloud.alphora.com/sandbox/r4/cds/fhir';

    this.FhirServer = {
      BaseUrl: this.#removeTrailingSlash(baseURL),
      CqlOperation: process.env.CQL_OPERATION || configData.FhirServer?.CqlOperation || '$cql'
    };
    
    this.Build = {
      CqlFileVersion: process.env.CQL_FILE_VERSION || configData.Build?.CqlFileVersion || '1.0.000',
      CqlOutputPath: process.env.CQL_OUTPUT_PATH || configData.Build?.CqlOutputPath || './cql',
      CqlVersion: process.env.CQL_VERSION || configData.Build?.CqlVersion,
      testsRunDescription: process.env.TESTS_RUN_DESCRIPTION || configData.Build?.testsRunDescription
    };
    
    this.Tests = {
      ResultsPath: process.env.RESULTS_PATH || configData.Tests?.ResultsPath || './results',
      SkipList: process.env.SKIP_LIST || configData.Tests?.SkipList || []
    };
    
    this.Debug = {
      QuickTest: this.#setQuickTestSetting(configData)
    };

    this.CqlEndpoint = this.#cqlEndPoint();
  }

  get apiUrl(): string {
    if (this.FhirServer.CqlOperation === '$cql') {
      return this.FhirServer.BaseUrl + '/$cql';
    } else {
      return this.FhirServer.BaseUrl + '/Library' + '/$evaluate';
    }
  }

  // TODO: validate the config values
  #removeTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  #cqlEndPoint(): string {
    if (this.FhirServer.CqlOperation === '$cql') {
      return '$cql';
    } else {
      return 'Library' + '/$evaluate';
    }
  }

  #loadConfig(configPath?: string): any {
    if (!configPath) {
      return {};
    }

    try {
      const fullPath = path.resolve(configPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`Configuration file not found: ${fullPath}`);
        return {};
      }

      const configContent = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.warn(`Error loading configuration file: ${error}`);
      return {};
    }
  }

  #setQuickTestSetting(configData: any): boolean {
    if (process.env.QUICK_TEST !== undefined) {
      return process.env.QUICK_TEST === 'true';
    }

    const configValue = configData.Debug?.QuickTest;
    if (configValue !== undefined) {
      return configValue as boolean;
    }

    return true;
  }

  skipListMap(): Map<string, string> {
    const skipList = this.Tests.SkipList;
    const skipMap = new Map(
      skipList.map(skipItem => [
        `${skipItem.testsName}-${skipItem.groupName}-${skipItem.testName}`,
        skipItem.reason
      ])
    );
    return skipMap;
  }

  #validateConfig(configPath: string, configData: any): void {
    try {
      const validator = new ConfigValidator();
      const validation = validator.validateConfig(configData);
      
      if (!validation.isValid) {
        const errorMessage = `Configuration validation failed for ${configPath}:\n${validator.formatErrors(validation.errors)}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log(`✓ Configuration file validated successfully: ${configPath}`);
    } catch (error: any) {
      if (error.message.includes('Configuration validation failed')) {
        throw error; // Re-throw validation errors
      }
      console.warn(`Warning: Could not validate configuration file ${configPath}: ${error.message}`);
    }
  }
}
