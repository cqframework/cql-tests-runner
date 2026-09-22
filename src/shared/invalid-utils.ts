/**
 * Semantics of the test schema's `invalid` attribute.
 *
 * `testSchema.xsd` defines five values for `InvalidType`, four of which say the test expects the
 * engine to fail — they differ only in *how* it is expected to fail:
 *
 * - `false`     — the expression is expected to evaluate successfully
 * - `syntax`    — expected to produce a syntax error (the translator rejects it)
 * - `semantic`  — expected to produce a semantic error (the translator rejects it)
 * - `execution` — expected to produce an execution error
 * - `true`      — expected to produce a runtime error
 *
 * Treating only `true` and `semantic` as error-expecting scored a test as failed when the engine
 * had in fact produced the syntax error the test asked for.
 */
export type InvalidKind = 'false' | 'syntax' | 'semantic' | 'execution' | 'true';

/** `invalid` as recorded on a result, which also covers a test that declares no expression. */
export type ResultInvalidKind = InvalidKind | 'undefined';

const ERROR_EXPECTED: ReadonlySet<string> = new Set(['true', 'semantic', 'syntax', 'execution']);

/**
 * True when the test expects the engine to error, whatever kind of error that is. Such a test
 * passes only if the engine actually errored, and needs no `<output>` to compare against.
 */
export function expectsError(invalid: string | undefined): boolean {
	return invalid !== undefined && ERROR_EXPECTED.has(invalid);
}

const TRANSLATION_ERRORS: ReadonlySet<string> = new Set(['semantic', 'syntax']);

/**
 * True when the expression cannot survive CQL-to-ELM translation, so it must be left out of a
 * generated library — one such define would fail the translation of every define around it.
 * Runtime and execution errors translate fine and are kept.
 */
export function preventsTranslation(invalid: string | undefined): boolean {
	return invalid !== undefined && TRANSLATION_ERRORS.has(invalid);
}
