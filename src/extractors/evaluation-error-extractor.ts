import { BaseExtractor } from './base-extractor.js';

function operationOutcomeMessage(resource: any): string {
	const issue = resource?.issue?.[0];
	const fromIssue =
		issue?.details?.text ?? issue?.diagnostics ?? (issue != null ? JSON.stringify(issue) : undefined);
	if (fromIssue != null) {
		return fromIssue;
	}
	return resource != null ? JSON.stringify(resource) : 'unknown';
}

export class EvaluationErrorExtractor extends BaseExtractor {
	protected _process(parameter: any): any {
		if (parameter.name === 'evaluation error') {
			return `EvaluationError:${operationOutcomeMessage(parameter.resource)}`;
		}

		return undefined;
	}
}
