import { BaseExtractor } from '../base-extractor.js';

export class TimeExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    return parameter.hasOwnProperty("valueTime")
        ? `@T${parameter.valueTime.toString()}`
        : undefined;
  }
}
