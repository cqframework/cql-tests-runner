import * as path from 'node:path';

/**
 * Gets the file path for a JSON schema file
 * @param schemaName - Name of the schema ('cql-test-configuration' or 'cql-test-results')
 * @returns Full path to the schema file, or null if not found
 */
export function getSchemaPath(schemaName: string): string | null {
  try {
    if (schemaName === 'cql-test-configuration') {
      return path.join(
        import.meta.dirname,
        '../../assets/schema/cql-test-configuration.schema.json'
      );
    } else if (schemaName === 'cql-test-results') {
      return path.join(import.meta.dirname, '../../assets/schema/cql-test-results.schema.json');
    }
    return null;
  } catch {
    return null;
  }
}
