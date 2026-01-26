export abstract class BaseExtractor {
	private nextExtractor: BaseExtractor | null = null;

	constructor() {
		this.nextExtractor = null;
	}

	setNextExtractor(handler: BaseExtractor): BaseExtractor {
		this.nextExtractor = handler;
		return handler;
	}

	extractValue(parameter: any): any {
		const result = this._process(parameter);
		if (result !== undefined) {
			return result;
		} else if (this.nextExtractor) {
			return this.nextExtractor.extractValue(parameter);
		} else {
			return undefined;
		}
	}

	protected abstract _process(parameter: any): any;
}
