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
import { QuantityIntervalExtractor } from '../extractors/value-type-extractors/quantity-interval-extractor.js';
import { CodeExtractor } from '../extractors/value-type-extractors/code-extractor.js';
import { ConceptExtractor } from '../extractors/value-type-extractors/concept-extractor.js';
import { ResultExtractor } from '../extractors/result-extractor.js';

/**
 * Builds a ResultExtractor with the full chain of extractors
 */
export function buildExtractor(): ResultExtractor {
  const extractors = new EvaluationErrorExtractor();
  extractors
    .setNextExtractor(new NullEmptyExtractor())
    .setNextExtractor(new UndefinedExtractor())
    .setNextExtractor(new StringExtractor())
    .setNextExtractor(new BooleanExtractor())
    .setNextExtractor(new IntegerExtractor())
    .setNextExtractor(new DecimalExtractor())
    .setNextExtractor(new DateExtractor())
    .setNextExtractor(new DateTimeExtractor())
    .setNextExtractor(new TimeExtractor())
    .setNextExtractor(new QuantityExtractor())
    .setNextExtractor(new RatioExtractor())
    .setNextExtractor(new DateTimeIntervalExtractor())
    .setNextExtractor(new QuantityIntervalExtractor())
    .setNextExtractor(new CodeExtractor())
    .setNextExtractor(new ConceptExtractor());
  
  return new ResultExtractor(extractors);
}
