import { BaseExtractor } from '../base-extractor.js';

export class QuantityExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    // TODO: Use the precision extension (see DecimalExtractor)
    if (parameter.hasOwnProperty("valueQuantity") && parameter.valueQuantity.hasOwnProperty("value")) {
      return {
        value: parameter.valueQuantity.value,
        unit: parameter.valueQuantity.hasOwnProperty("code") 
            ? parameter.valueQuantity.code
            : null
      };
    }

    return undefined;
  }
}
