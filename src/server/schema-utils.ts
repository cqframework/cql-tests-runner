import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Gets the file path for a JSON schema file
 * @param schemaName - Name of the schema ('cql-test-configuration' or 'cql-test-results')
 * @returns Full path to the schema file, or null if not found
 */
export function getSchemaPath(schemaName: string): string | null {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    if (schemaName === 'cql-test-configuration') {
      return path.join(
        __dirname,
        '../../assets/schema/cql-test-configuration.schema.json'
      );
    } else if (schemaName === 'cql-test-results') {
      return path.join(__dirname, '../../assets/schema/cql-test-results.schema.json');
    }
    return null;
  } catch {
    return null;
  }
}
