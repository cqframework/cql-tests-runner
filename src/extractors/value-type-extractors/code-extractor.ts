import { BaseExtractor } from '../base-extractor.js';

export class CodeExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    if (!parameter.hasOwnProperty("valueCoding")) {
      return undefined;
    }

    const result: any = {
      code: parameter.valueCoding.code,
      system: parameter.valueCoding.system,
      display: parameter.valueCoding.display
    };
    
    if (parameter.valueCoding.version) {
      result.version = parameter.valueCoding.version;
    }
    
    return result;
  }
}
