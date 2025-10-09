import { BaseExtractor } from './base-extractor.js';

export class UndefinedExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    if (parameter.hasOwnProperty("name") && parameter.name === 'return' && Object.keys(parameter).length === 1) {
      return undefined;
    }

    return undefined;
  }
}
