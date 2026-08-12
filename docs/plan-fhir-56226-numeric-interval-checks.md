# Plan: Numeric interval (`Interval<Integer|Decimal|Long>`) checks per FHIR-56226

Tracker: [FHIR-56226](https://jira.hl7.org/browse/FHIR-56226) — "Add mapping for Intervals of Integer, Decimal, and Long"
Related runner issue: [#85 — Test Runner Not Detecting Equal Intervals (Open vs Closed Boundaries)](https://github.com/cqframework/cql-tests-runner/issues/85)

## Background

The CQL-to-FHIR mapping did not specify how to represent intervals of Integer, Decimal, or
Long. FHIR-56226 (spun out of issue #85 after the US Realm Connectathon 2026 discussion)
proposes mapping these as FHIR `Range`, with each boundary a unity `Quantity`
(`code: "1"`, `system: http://unitsofmeasure.org`) carrying a
`http://hl7.org/fhir/StructureDefinition/quantity-precision` extension (`valueInteger`).
Because `Range` cannot express open boundaries, an open boundary is converted to its
closed equivalent *at the stated precision*, and the precision extension preserves enough
information that this conversion does not force a precision choice:

```
Interval[1.0, 1.4)   ⇒   Range {
  low:  { value: 1.0, precision: 1 },   // code "1", system UCUM
  high: { value: 1.3, precision: 1 }    // predecessor of 1.4 at precision 1
}
```

(The Jira example writes the extension URL as `quanity-precision`; that is a typo in the
ticket — the real extension is `quantity-precision`.)

## Current state of the runner

| Concern | Where | Behavior today |
|---|---|---|
| Actual: interval extraction | `src/extractors/value-type-extractors/quantity-interval-extractor.ts` | Any `valueRange` becomes `{lowClosed, low: {value, unit}, highClosed, high: {value, unit}}`; boundaries are always closed when present; unity code `"1"` is kept as `unit: "1"`; precision extensions are ignored. |
| Actual: extractor chain | `src/server/extractor-builder.ts` | No numeric-interval extractor exists; unity-coded ranges fall through to `QuantityIntervalExtractor`. |
| Expected: parsing | `cvl/cvl.mjs` (`visitIntervalSelector`) | `Interval[1.0, 1.4)` → `{lowClosed: true, low: 1.0, highClosed: false, high: 1.4}` with plain-number boundaries (`BigInt` for `L` literals). Open/closed flags are preserved. |
| Comparison | `src/shared/results-utils.ts` (`resultsEqual`) | Generic structural compare with a `1e-8` numeric epsilon. An expected open interval never equals an actual closed `Range`, and a numeric expected boundary never equals a `{value, unit}` quantity object. |
| Symptom | `conf/cql-execution-local.json` | Five `CqlIntervalOperatorsTest` skips citing issue #85 (`DecimalIntervalExcept1to3`, `Except12`, `ExceptTime2`, `ExceptTimeInterval`, `IntegerIntervalExcept1to3`). |

Both gaps must be fixed for numeric intervals to pass:

1. **Shape gap** — a unity-coded `Range` must extract to plain numeric boundaries, not
   quantity objects.
2. **Boundary-semantics gap** — expected values may be written with open boundaries
   (`Interval[1.0, 1.4)`) while the actual `Range` is always closed; the comparison must
   equate the two using the declared precision.

## Step 1 — `NumericIntervalExtractor`

New file `src/extractors/value-type-extractors/numeric-interval-extractor.ts`:

- Handles a parameter with `valueRange` only when the interval is *declared* numeric by the
  `http://hl7.org/fhir/StructureDefinition/cqf-cqlType` extension on the parameter naming
  `Interval<System.Integer>`, `Interval<System.Long>` or `Interval<System.Decimal>` (the
  `System.` prefix is optional). Detection is strictly this: no such extension (or a
  non-numeric interval type) means the range is not claimed and falls through to
  `QuantityIntervalExtractor` unchanged. This also resolves the existing TODO pattern in
  `datetime-interval-extractor.ts`.
  - A fallback that inferred a numeric interval from boundary quantities with `code === '1'`,
    `system === 'http://unitsofmeasure.org'` and no human `unit` was implemented and then
    rejected in review: FHIR-56226 only defines the forward mapping (how a numeric interval
    is represented), not an inverse detection rule, and unity coding is ambiguous with a
    genuinely dimensionless `Interval<Quantity>`.
- Extracts to the same shape CVL produces: `{lowClosed, low, highClosed, high}` with
  **plain-number boundaries** (missing boundary → `null` + `*Closed: false`, mirroring
  `QuantityIntervalExtractor`). `Interval<Long>` boundaries extract as **BigInt** to match
  the CVL-parsed expecteds exactly beyond 2^53; exactness there requires the engine to
  send the value as a JSON string, since a bare JSON number is rounded by the JSON parser
  before extraction.
- Reads the `quantity-precision` extension from both plausible placements and records it:
  - `low.extension[]` (placement shown in the Jira example), and
  - `low._value.extension[]` (primitive-extension placement, since the extension is
    defined on `Quantity.value`).
- Precision must ride along for the comparison step **without breaking structural
  equality** (`resultsEqual` compares `Object.keys` counts). Attach it under a shared
  `Symbol` key (e.g. `INTERVAL_PRECISION` exported from a small
  `src/shared/interval-utils.ts`): symbols are invisible to `Object.keys`/JSON but
  readable by the comparator.
- Register it in `src/server/extractor-builder.ts` **before** `QuantityIntervalExtractor`
  so declared numeric ranges are claimed first; every other range (including unity-coded
  ranges without a cqlType extension) keeps its current behavior.

## Step 2 — Interval-aware comparison

In `src/shared/results-utils.ts` (helpers in `src/shared/interval-utils.ts`):

- In `resultsEqual`, before the generic object walk, detect "interval-shaped" operands
  (objects owning `lowClosed` and `highClosed`) and delegate to `intervalsEqual(expected, actual)`.
- `intervalsEqual` normalizes both sides to closed boundaries, then compares numerically
  with a tolerance of **half the boundary's step** — the tolerance must sit well below the
  step itself, otherwise values a full step apart land exactly on the comparison boundary
  and the verdict depends on float rounding; half a step is also the semantic rule
  ("same point at the effective precision" vs "adjacent points"):
  - **Comparison step size**, from the point type and precision the *actual*'s extractor
    recorded as metadata: `1` for a recorded Integer/Long point type (a precision
    extension cannot change the distance between integer points); otherwise `10^-p` from
    the actual boundary's `quantity-precision` extension when present; otherwise the
    Decimal default `1e-8` (this is why suite expecteds are written like
    `Interval[1.0, 3.99999999]`).
    - The step of `1` therefore requires a *declared or wire-derived* point type — the
      `cqf-cqlType` extension for a Range, the FHIR element type of the boundary parts
      (`valueInteger` vs `valueDecimal`) for the `part`-based form. A heuristic that
      inferred it from integral-looking boundary values on either side was implemented and
      then dropped in review: `1` and `1.0` are the same JS number, so the heuristic
      accepted both the integer-step and the decimal-step answer for the same untyped
      expected interval. An untyped interval now always steps by `1e-8`.
  - **Expected side**: if `highClosed === false && high !== null`, replace `high` with
    `high - step` (successor for open low). With the ticket's example, expected
    `[1.0, 1.4)` at the actual's declared precision 1 → `[1.0, 1.3]`, matching the
    actual Range; expected `[1.0, 3.99999999]` (already closed) still matches an
    engine that sends the full-precision predecessor.
  - **Actual side**: extracted Ranges are already closed; the flags stay as extracted.
    Intervals from other representations (e.g. the `part`-based Tuple form in issue #85)
    may carry `highClosed: false` — normalize those the same way so open-vs-closed
    equivalence works for every numeric interval representation, not just Range.
    `ResultExtractor` attaches the same `pointType` metadata to a part-based interval,
    taken from the parameter's `cqf-cqlType` extension when it names a numeric interval
    type and otherwise derived from the boundary parts' element types (`valueInteger` →
    Integer, `valueDecimal` → Decimal; `valueString` is ambiguous and derives nothing, and
    so does a mix). Without that metadata a part-based open boundary is normalized at the
    decimal step.
  - **Null boundaries** compare as today (both null → equal).
  - **Long**: CVL yields `BigInt` for `1L` literals; coerce BigInt↔number safely before
    the epsilon compare (values inside FHIR decimals are within `Number` range in the
    suite; guard with `Number.isSafeInteger` and fall back to `BigInt` equality when both
    sides are integral).
- Deliberately *not* over-lenient: sides are compared after normalizing at the **actual's
  declared precision** (or CQL default). An engine that truncates a predecessor at a
  precision it did not declare (e.g. returns `3.9` with no precision extension for
  `[1.0, 4.0)`) still fails against `[1.0, 3.99999999]` — that is a genuinely different
  interval.

## Step 3 — Unit tests (vitest, `test/`)

- `test/extractResults-cql_operations.test.ts` (and the `$evaluate` twin):
  - cqlType-declared Range with precision extensions (both `extension` and
    `_value.extension` placements) → numeric interval with plain-number boundaries;
  - integer range (no precision extension) and half-open range (missing `high`);
  - real quantity Range (e.g. `ml`), an `Interval<System.Quantity>` cqlType over unity
    boundaries, and a unity-coded range with **no** cqlType extension all still extract via
    `QuantityIntervalExtractor` (regression guards on chain ordering and strict detection).
- `test/results-utils.test.ts`:
  - ticket example: expected `Interval[1.0, 1.4)` vs actual `[1.0, 1.3]` @ precision 1 → pass;
  - issue #85 case: expected `Interval[1.0, 3.99999999]` vs actual open `[1.0, 4.0)`
    (part-form) and vs closed `[1.0, 3.99999999]` → pass;
  - `IntegerIntervalExcept1to3`-style: expected `Interval[1, 4)` vs actual `[1, 3]` → pass;
  - negative cases: mismatched precision (`3.9`, no extension, vs `3.99999999`),
    differing closed flags with differing values, null vs non-null boundary;
  - Long boundaries (`Interval[1L, 4L)`).
- `test/cvl-parser.test.ts`: add open-boundary interval parse cases if not covered.

## Step 4 — Docs and configuration cleanup

- Update the README Test Flow notes (currently "Interval → Range + cqf-cqlType") to
  describe the numeric-interval mapping and the precision-based open→closed
  normalization.
- Once verified against a live engine, drop (or re-word) the five issue-85 skip entries in
  `conf/cql-execution-local.json`; they are engine-specific config, so removal can be a
  follow-up commit after a `run-tests` pass against cql-execution.

## Risks / open questions

- **FHIR-56226 is still "Submitted"** — the mapping is proposed, not yet applied to the
  CQL IG. Detection *requires* the `cqf-cqlType` extension, so existing representations keep
  working unchanged (part-based Tuple form, plain quantity ranges), but an engine that omits
  `cqf-cqlType` will have its numeric-interval results extracted as quantity intervals and
  will fail those tests until it declares the type.
- **Extension placement ambiguity** — the ticket shows `low.extension`, FHIR primitive
  extension rules imply `low._value.extension`; support both until the IG publishes the
  normative shape.
- **String decimal values** — the ticket example shows `value: "1.0"` (a string) to keep
  trailing zeros; FHIR JSON says `decimal`. Tolerate both (`typeof value === 'string'` →
  `Number(value)`, and take digits-after-dot as an implicit precision fallback when no
  extension is present).
- **Quantity intervals** — the same open/closed problem exists for `Interval<Quantity>`
  (skips `ExceptTime2`/`ExceptTimeInterval` are Time, and quantity ranges can be open
  too). The `intervalsEqual` normalization is written boundary-type-agnostic where cheap
  (numbers and `{value, unit}` quantities); Date/DateTime/Time predecessor logic is out of
  scope here and tracked by issues #80/#84.
