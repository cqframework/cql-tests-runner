import { BaseExtractor } from './base-extractor.js';

export class UndefinedExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		// Always returns undefined to pass through to next extractor
		return undefined;
	}
}
