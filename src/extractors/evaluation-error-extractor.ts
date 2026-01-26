import { BaseExtractor } from './base-extractor.js';

export class EvaluationErrorExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.name === 'evaluation error') {
			return `EvaluationError:${parameter.resource.issue[0].details.text}`;
		}

		return undefined;
	}
}
