import { BaseExtractor } from '../base-extractor.js';

export class RatioExtractor extends BaseExtractor {
  protected _process(parameter: any): any {
    function getQuantity(value: any): any {
      if (value.hasOwnProperty("value")) {
        return {
          value: value.value,
          unit: value.hasOwnProperty("code") ? value.code : null
        };
      }
      
      return null;
    }

    if (parameter.hasOwnProperty("valueRatio")) {
      const numerator = parameter.valueRatio.hasOwnProperty("numerator")
          ? getQuantity(parameter.valueRatio.numerator)
          : null;

      const denominator = parameter.valueRatio.hasOwnProperty("denominator")
          ? getQuantity(parameter.valueRatio.denominator)
          : null;

      return {
        numerator: numerator,
        denominator: denominator
      };
    }

    return undefined;
  }
}
