import { EvaluationErrorExtractor } from '../extractors/evaluation-error-extractor.js';
import { NullEmptyExtractor } from '../extractors/null-empty-extractor.js';
import { UndefinedExtractor } from '../extractors/undefined-extractor.js';
import { StringExtractor } from '../extractors/value-type-extractors/string-extractor.js';
import { BooleanExtractor } from '../extractors/value-type-extractors/boolean-extractor.js';
import { IntegerExtractor } from '../extractors/value-type-extractors/integer-extractor.js';
import { DecimalExtractor } from '../extractors/value-type-extractors/decimal-extractor.js';
import { DateExtractor } from '../extractors/value-type-extractors/date-extractor.js';
import { DateTimeExtractor } from '../extractors/value-type-extractors/datetime-extractor.js';
import { TimeExtractor } from '../extractors/value-type-extractors/time-extractor.js';
import { QuantityExtractor } from '../extractors/value-type-extractors/quantity-extractor.js';
import { RatioExtractor } from '../extractors/value-type-extractors/ratio-extractor.js';
import { DateTimeIntervalExtractor } from '../extractors/value-type-extractors/datetime-interval-extractor.js';
import { NumericIntervalExtractor } from '../extractors/value-type-extractors/numeric-interval-extractor.js';
import { QuantityIntervalExtractor } from '../extractors/value-type-extractors/quantity-interval-extractor.js';
import { CodeExtractor } from '../extractors/value-type-extractors/code-extractor.js';
import { ConceptExtractor } from '../extractors/value-type-extractors/concept-extractor.js';
import {
	CqlTextIntervalExtractor,
	type CqlTextParser,
} from '../extractors/value-type-extractors/cql-text-interval-extractor.js';
import { ResultExtractor } from '../extractors/result-extractor.js';
import type { BaseExtractor } from '../extractors/base-extractor.js';

export type BuildExtractorOptions = {
	/**
	 * Parser for `cqf-cqlText` values. When given, CQL text flagged by that extension is
	 * decoded back into intervals (see {@link CqlTextIntervalExtractor} — not part of the CQL
	 * specification). When omitted, such text is left as a string.
	 */
	cqlTextParser?: CqlTextParser;
};

/**
 * Builds a ResultExtractor with the full chain of extractors
 */
export function buildExtractor(options: BuildExtractorOptions = {}): ResultExtractor {
	const extractors = new EvaluationErrorExtractor();
	let tail: BaseExtractor = extractors
		.setNextExtractor(new NullEmptyExtractor())
		.setNextExtractor(new UndefinedExtractor());

	// It must precede StringExtractor, which would otherwise claim the same valueString.
	if (options.cqlTextParser !== undefined) {
		tail = tail.setNextExtractor(new CqlTextIntervalExtractor(options.cqlTextParser));
	}

	tail.setNextExtractor(new StringExtractor())
		.setNextExtractor(new BooleanExtractor())
		.setNextExtractor(new IntegerExtractor())
		.setNextExtractor(new DecimalExtractor())
		.setNextExtractor(new DateExtractor())
		.setNextExtractor(new DateTimeExtractor())
		.setNextExtractor(new TimeExtractor())
		.setNextExtractor(new QuantityExtractor())
		.setNextExtractor(new RatioExtractor())
		.setNextExtractor(new DateTimeIntervalExtractor())
		.setNextExtractor(new NumericIntervalExtractor())
		.setNextExtractor(new QuantityIntervalExtractor())
		.setNextExtractor(new CodeExtractor())
		.setNextExtractor(new ConceptExtractor());

	return new ResultExtractor(extractors);
}
