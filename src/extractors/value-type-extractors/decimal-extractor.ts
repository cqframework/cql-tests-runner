import { BaseExtractor } from '../base-extractor.js';

export class DecimalExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		// TODO: Support the precision extension to preserve precision
		return parameter.hasOwnProperty('valueDecimal') ? parameter.valueDecimal : undefined;
	}
}
