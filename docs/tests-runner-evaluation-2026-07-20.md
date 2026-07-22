# cql-tests-runner — Evaluation & Improvement Recommendations

_Date: 2026-07-20 · Reviewed against working tree on `main` (includes uncommitted Thread-1 invalid-test changes and the `CQL_TESTS_PATH` loader override)._

Produced from a four-way parallel review of the runner's subsystems (execution core, extractors, config/loading/results, server/jobs/MCP). The three highest-impact structural claims were verified directly against the code (axios error handling, extractor chain order, `skipMessage` casing).

## Verdict

The runner works, but it has **two parallel execution paths (CLI vs server) that have silently diverged**. That divergence is the source of the most serious problems: the same test can score differently depending on how it's run. Most other findings are maintainability/robustness.

---

## Tier 1 — Correctness bugs that change pass/fail verdicts

**1. CLI and server disagree on error-expecting tests (`invalid="true"/"semantic"`). — FIXED 2026-07-22.**
Axios (CLI path, `useAxios: true`) was called with no `validateStatus`, so any 4xx/5xx threw into the catch at `src/services/test-runner.ts:214` → `error`. The server path uses `fetch`, keeps the status, and `responseIndicatesError` → `pass`/`fail`. So a non-2xx response scored `error` on CLI but `pass`/`fail` on server.
Demonstrated empirically with `CqlListOperatorsTest:Skip:SkipNullNumber` (engine returns HTTP 500): CLI → `error` (actual undefined), server → `fail` (responseStatus 500, OperationOutcome captured).
Fix applied: added `validateStatus: () => true` to the axios call so non-2xx flows into the classification logic. Re-ran the same test through both paths — now identical (`fail`, `responseStatus 500`). Broader cleanup (drop axios for fetch entirely) still open under #6.

**2. Version-gated skipping exists only in the CLI runner.**
`TestRunner` computes `shouldSkipVersionTest`/`compareVersions` (`src/services/test-runner.ts:70-84,236-271`); `TestExecutionService` has none. Run the same suite through the server and version-inapplicable tests actually execute and fail.
→ Move version gating into the shared path.

**3. `cqf-cqlText` interval gap (Thread 2).**
Root cause confirmed. Clean fix available: `cvl.parse("Interval[1,2]")` already emits `{low, high, lowClosed, highClosed}` — the exact shape the interval extractors produce. Add one `StringIntervalExtractor` gated on the `cqf-cqlText` **extension URL** (not the string shape), registered immediately before `StringExtractor` at `src/server/extractor-builder.ts:27`, delegating to `cvl.parse`. `cvl` must be injected into the extractor (extractors currently take no deps).
→ Still a judgment call: `cqf-cqlText` is CQF-implementation-specific, not CQL-spec-compliant (see memory `cqf-cqltext-not-compliant`). Decoding a non-spec extension in a conformance runner is the open decision.

**4. Skip messages silently dropped.**
`src/server/test-execution-service.ts:80,83,88` all write `result.SkipMessage` (capital S), but `src/test-results/cql-test-results.ts:105` only serializes `skipMessage` → every server-side skip loses its reason. The OnlyList branch at `src/services/test-runner.ts:137` has the same bug.
→ Normalize to `skipMessage`; delete the `SkipMessage` field at `src/models/test-types.ts:83` so the compiler catches misuse.

**5. `resultsEqual` numeric tolerance.**
Fixed absolute `1e-8` at `src/shared/results-utils.ts:14` is too tight for large decimals; no `typeof actual === 'number'` guard, so a type mismatch becomes a quiet `fail` (NaN comparison) instead of surfacing. Object compare (lines 30-39) treats arrays and objects interchangeably via `Object.keys`.
→ Relative-or-absolute tolerance + type guard; distinguish array vs object.

---

## Tier 2 — Structural (the root cause of Tier 1)

**6. `test-runner.ts` and `test-execution-service.ts` are near-verbatim copies.**
`createExecutionContext`, `runTest`, and the skip/compare block are duplicated. Bugs #1, #2, #4 all exist *because* fixes landed in one copy and not the other. **Highest-leverage change** — extract one shared `runTest`/context module; make `TestRunner` (progress callback) and `TestExecutionService` thin wrappers.

**7. Extractor chain is mutation-based and order-fragile.**
`setNextExtractor` (`src/extractors/base-extractor.ts:8-11`) only appends. Correctness silently depends on `valueString` matchers preceding `StringExtractor` (which sits at chain position 4, before all typed extractors — `src/server/extractor-builder.ts:27`), and nothing tests it.
→ Replace the fluent chain with an explicit ordered array reduced into the chain; makes #3 a one-line insert and lets a test assert the ordering invariant.

**8. REST routes and MCP tools duplicate orchestration** instead of sharing a service layer.
`src/server/mcp-server-setup.ts` (754 lines) is ~half copy-paste boilerplate; `textResult`/`textError`/`withValidatedConfig` helpers would collapse it. `create_job`/`validate_*`/`run_all_tests` reimplement the matching REST routes. Validators are re-instantiated per request (recompiling schemas).

**9. Dead / duplicated code.**
- `src/services/test-runner.old.ts` — untracked, 275 lines, contains the *old buggy* comparison semantics (`response.status === 200 ? 'fail' : 'pass'`, unguarded `cvl.parse`). Delete.
- `UndefinedExtractor` — pure no-op chain slot.
- `config-validator.ts` / `results-validator.ts` — line-for-line copies differing only in schema path; extract a shared `SchemaValidator`.
- `config` npm dependency — imported nowhere; remove.
- Duplicated `getQuantity` in `ratio-extractor.ts:5-14` and `quantity-interval-extractor.ts:5-14` (+ inline in `quantity-extractor.ts`); extract a shared `toQuantity` helper.
- SkipList/OnlyList env-parsing IIFE duplicated in `config-loader.ts:71-99` and `run-tests-command.ts:60-88`.

---

## Tier 3 — Robustness, performance, ergonomics

**Execution / performance**
- **No per-request timeout or retries** (`test-runner.ts:165`, `test-execution-service.ts:97`) — one hung request stalls the whole run. Add `AbortSignal.timeout` + bounded retries. Distinguish transport errors from JSON-parse errors on malformed bodies.
- **Tests run strictly sequentially** — wall-clock ≈ latency × test count. A bounded concurrency pool (write into pre-allocated slots to preserve ordering) is likely a several-fold speedup.

**Config / loading / results**
- **Results filenames are timestamp-only, minute-resolution** (`cql-test-results.ts:147-165`) — the reason connectathon vs main had to be hand-renamed, and same-minute runs overwrite. Embed a slug from `testsRunDescription`/config basename + seconds; record the source test dir in the JSON metadata.
- **`CQL_TESTS_PATH` override (added this session) is env-only and undiscoverable** (`src/loaders/test-loader.ts:6`); reads *every* dir entry with no `.xml` filter (a subdir → `EISDIR`; parses `.zip`/`.txt`); relative to CWD. Promote to a `--tests-path` CLI arg / `Tests.TestsPath` config key (variadic → multiple dirs in one run); filter to `.xml`; resolve against repo root; keep env var as fallback.
- **Config validation is skipped for env/default-driven configs**; a typo'd config path warns-and-defaults to a remote server (`config-loader.ts:31-37,42,129-147`). Treat unreadable config path as a hard error; validate the effective merged config.
- **CLI ergonomics** — `output` is a required positional even though config provides a fallback; no CLI surface for tests-path/skip/only/server-url; `--validate` never gates writes (consider `--strict` non-zero exit for CI).
- `copy-assets` copies the entire experimental `cql-tests` tree (zips, scratch dirs) into every build.

**Server hardening** (`src/server/*`, `src/jobs/*`)
- Unauthenticated + wide-open CORS (`origin: '*'`) + caller-supplied `FhirServer.BaseUrl` drives outbound requests → **SSRF**. Add auth + BaseUrl allowlist/private-range block.
- `jobId` unvalidated into a filesystem path (`job-manager.ts:119,125`) → **path traversal**. Validate against a UUID regex before FS access.
- Global error handler registered *before* routes (`server-command.ts` constructor) → never fires. Register after routes + 404.
- Job-status writes non-atomic (`job-manager.ts:51-64,118-121`) — a concurrent read can 404 a live job. Write-temp-then-rename; consider not persisting every progress tick.
- Jobs run fire-and-forget with no concurrency cap (`rest-routes.ts:135`, `mcp-server-setup.ts:504`). Add a bounded worker pool.
- `GET /jobs/:id` returns **HTTP 500** for a `failed` job (`rest-routes.ts:189-191`) — should be 200 with the terminal state (MCP path already does this).
- Old jobs cleaned up only on graceful shutdown (`server-command.ts:152`) — add a periodic timer.

**Minor correctness nits**
- Interval boundary-closure inference is inconsistent: `DateTimeIntervalExtractor` hardcodes `highClosed: true` (can yield `{high: null, highClosed: true}`), `QuantityIntervalExtractor` derives both from null-ness. Unify.
- `CodeExtractor` vs `ConceptExtractor` disagree on optional-field (`version`/`display`) handling — may false-negative on shape-sensitive compare. Share a `toCode(coding)` helper.
- `format_datetime` length heuristic (`value-type-extractor-utils.ts:1-8`) misfires on partial-precision DateTimes (`2012` → `@2012T`). Key off precision extension or test for existing time component.
- `responseIndicatesError` (`results-shared.ts:121`) keys off a parameter literally named `evaluation error` — engine-specific; also treat an `OperationOutcome` with `severity: error` as an error.

---

## Suggested sequence

1. **Deduplicate the two runners** (#6) — unblocks the rest.
2. On the unified path: fix axios error semantics (#1), fold in version-skipping (#2), normalize `skipMessage` (#4). Delete `test-runner.old.ts`.
3. Convert the extractor chain to an ordered array (#7), then decide on / add the `cqf-cqlText` extractor (#3).
4. Timeouts + bounded parallelism; results-filename provenance + `--tests-path`.
5. Server hardening as a separate pass.
