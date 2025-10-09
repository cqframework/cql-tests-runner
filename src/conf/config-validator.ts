import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface ValidationError {
  message: string;
  dataPath: string;
  schemaPath: string;
  data?: any;
}

export class ConfigValidator {
  private ajv: Ajv;
  private schema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.loadSchema();
  }

  private loadSchema(): void {
    try {
      // Use import.meta.url for ES modules
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, '../../assets/schema/cql-test-configuration.schema.json');
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      this.schema = JSON.parse(schemaContent);
    } catch (error) {
      throw new Error(`Failed to load configuration schema: ${error}`);
    }
  }

  /**
   * Validates a configuration object against the schema
   * @param configData The configuration object to validate
   * @returns Object containing validation result and any errors
   */
  validateConfig(configData: any): { isValid: boolean; errors: ValidationError[] } {
    const validate = this.ajv.compile(this.schema);
    const isValid = validate(configData);
    
    const errors: ValidationError[] = [];
    if (!isValid && validate.errors) {
      errors.push(...validate.errors.map(error => ({
        message: error.message || 'Unknown validation error',
        dataPath: error.instancePath || error.schemaPath || '',
        schemaPath: error.schemaPath || '',
        data: error.data
      })));
    }

    return { isValid, errors };
  }

  /**
   * Validates a configuration file
   * @param configPath Path to the configuration file
   * @returns Object containing validation result and any errors
   */
  validateConfigFile(configPath: string): { isValid: boolean; errors: ValidationError[] } {
    try {
      const fullPath = path.resolve(configPath);
      if (!fs.existsSync(fullPath)) {
        return {
          isValid: false,
          errors: [{
            message: `Configuration file not found: ${fullPath}`,
            dataPath: '',
            schemaPath: '',
            data: configPath
          }]
        };
      }

      const configContent = fs.readFileSync(fullPath, 'utf8');
      const configData = JSON.parse(configContent);
      
      return this.validateConfig(configData);
    } catch (error: any) {
      return {
        isValid: false,
        errors: [{
          message: `Error reading configuration file: ${error.message}`,
          dataPath: '',
          schemaPath: '',
          data: configPath
        }]
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

    return errors.map((error, index) => {
      const location = error.dataPath ? ` at ${error.dataPath}` : '';
      return `${index + 1}. ${error.message}${location}`;
    }).join('\n');
  }
}
