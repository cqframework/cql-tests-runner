import { BaseExtractor } from '../base-extractor.js';

export class IntegerExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    return parameter.hasOwnProperty("valueInteger") ? parameter.valueInteger : undefined;
  }
}
