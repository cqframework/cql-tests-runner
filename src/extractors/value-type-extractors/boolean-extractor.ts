import { BaseExtractor } from '../base-extractor.js';

export class BooleanExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    return parameter.hasOwnProperty("valueBoolean") 
           ? parameter.valueBoolean
           : undefined;
  }
}
