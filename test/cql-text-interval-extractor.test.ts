import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';

import { decodeCqfCqlTextSetting } from '../src/conf/debug-settings.js';
import { ValueMap } from '../src/extractors/value-map.js';
import { CQF_CQL_TEXT_URL } from '../src/extractors/value-type-extractors/cql-text-interval-extractor.js';
import { buildExtractor } from '../src/server/extractor-builder.js';
import { resultsEqual } from '../src/shared/results-utils.js';

let cvl: any = null;

beforeAll(async () => {
	// @ts-ignore - cvl.mjs has no declaration file
	const cvlModule = await import('../cvl/cvl.mjs');
	cvl = cvlModule.default;
});

const UNFLAGGED = Symbol('no cqf-cqlText extension');

/** A `return` parameter carrying `text` in valueString, flagged as CQL text by default. */
function cqlTextParameter(text: string, flag: any = true): any {
	const parameter: any = { name: 'return', valueString: text };
	if (flag !== UNFLAGGED) {
		parameter._valueString = { extension: [{ url: CQF_CQL_TEXT_URL, valueBoolean: flag }] };
	}
	return parameter;
}

/** A `$cql` response with one `return` parameter per text, as the engine sends lists. */
function cqlTextResponse(texts: string | string[], flag: any = true): any {
	const all = Array.isArray(texts) ? texts : [texts];
	return { resourceType: 'Parameters', parameter: all.map(text => cqlTextParameter(text, flag)) };
}

/** Extracts and compares the way run-test-core does, with decoding on or off. */
function passes(expectedText: string, response: any, decode = true): boolean {
	const parsedExpected = cvl.parse(expectedText);
	const extractor = buildExtractor(decode ? { cqlTextParser: text => cvl.parse(text) } : {});
	const actual = extractor.extract(response, {
		singletonListKeys: ValueMap.singletonListKeysFromExpected(parsedExpected),
	});
	return resultsEqual(parsedExpected, actual);
}

describe('decoding cqf-cqlText intervals', () => {
	// Response bodies below are as returned by the Java CQFramework engine 4.1.0.

	test('an Integer interval', () => {
		expect(passes('Interval[2, 7]', cqlTextResponse('Interval[2, 7]'))).toBe(true);
	});

	test('a Time interval', () => {
		const text = 'Interval[@T00:00:00.000, @T23:59:59.599]';
		expect(passes(text, cqlTextResponse(text))).toBe(true);
	});

	test('an uncertainty interval, whatever the spacing of the expected text', () => {
		expect(passes('Interval[ 17, 44 ]', cqlTextResponse('Interval[17, 44]'))).toBe(true);
	});

	test('a list of intervals, sent as one parameter per interval', () => {
		expect(
			passes(
				'{Interval [ 1, 10 ], Interval [ 12, 19 ]}',
				cqlTextResponse(['Interval[1, 10]', 'Interval[12, 19]'])
			)
		).toBe(true);
	});

	test('a single interval stays a one-element list when a list is expected', () => {
		expect(passes('{Interval [ 4, 8 ]}', cqlTextResponse('Interval[4, 8]'))).toBe(true);
	});

	test('a decoded interval with different bounds still fails', () => {
		expect(passes('Interval[2, 7]', cqlTextResponse('Interval[2, 8]'))).toBe(false);
		expect(passes('Interval[2, 7]', cqlTextResponse('Interval[2, 7)'))).toBe(false);
	});

	test('the same responses fail with decoding disabled', () => {
		expect(passes('Interval[2, 7]', cqlTextResponse('Interval[2, 7]'), false)).toBe(false);
	});
});

describe('values the decoder leaves alone', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function extractWithDecoding(response: any): any {
		return buildExtractor({ cqlTextParser: text => cvl.parse(text) }).extract(response);
	}

	test('a valueString without the cqf-cqlText extension', () => {
		expect(extractWithDecoding(cqlTextResponse('Interval[2, 7]', UNFLAGGED))).toBe(
			'Interval[2, 7]'
		);
	});

	test('a cqf-cqlText extension that is not true', () => {
		expect(extractWithDecoding(cqlTextResponse('Interval[2, 7]', false))).toBe(
			'Interval[2, 7]'
		);
	});

	test('CQL text that is not an interval', () => {
		expect(extractWithDecoding(cqlTextResponse('5'))).toBe('5');
		expect(extractWithDecoding(cqlTextResponse("'abc'"))).toBe("'abc'");
		expect(extractWithDecoding(cqlTextResponse('{ 1, 2 }'))).toBe('{ 1, 2 }');
		expect(extractWithDecoding(cqlTextResponse('{}'))).toBe('{}');
	});

	test('the text of a whole list, even a list of intervals', () => {
		// Engines send lists as one parameter per element; list text is not decoded.
		expect(extractWithDecoding(cqlTextResponse('{ Interval[1, 2], Interval[3, 4] }'))).toBe(
			'{ Interval[1, 2], Interval[3, 4] }'
		);
	});

	test('text cvl cannot parse', () => {
		// cvl reports the syntax error on the console rather than throwing.
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		expect(extractWithDecoding(cqlTextResponse('not cql ]['))).toBe('not cql ][');
	});

	test('a parser that throws', () => {
		const extractor = buildExtractor({
			cqlTextParser: () => {
				throw new Error('boom');
			},
		});
		expect(extractor.extract(cqlTextResponse('Interval[2, 7]'))).toBe('Interval[2, 7]');
	});

	test('everything, when the extractor is built without a parser', () => {
		expect(buildExtractor().extract(cqlTextResponse('Interval[2, 7]'))).toBe('Interval[2, 7]');
	});
});

describe('Debug.DecodeCqfCqlText', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	test('defaults to on', () => {
		vi.stubEnv('DECODE_CQF_CQLTEXT', undefined as any);
		delete process.env.DECODE_CQF_CQLTEXT;
		expect(decodeCqfCqlTextSetting({})).toBe(true);
		expect(decodeCqfCqlTextSetting({ Debug: { QuickTest: true } })).toBe(true);
	});

	test('follows the config value', () => {
		delete process.env.DECODE_CQF_CQLTEXT;
		expect(decodeCqfCqlTextSetting({ Debug: { DecodeCqfCqlText: false } })).toBe(false);
		expect(decodeCqfCqlTextSetting({ Debug: { DecodeCqfCqlText: true } })).toBe(true);
	});

	test('is overridden by DECODE_CQF_CQLTEXT', () => {
		vi.stubEnv('DECODE_CQF_CQLTEXT', 'false');
		expect(decodeCqfCqlTextSetting({ Debug: { DecodeCqfCqlText: true } })).toBe(false);
		vi.stubEnv('DECODE_CQF_CQLTEXT', 'true');
		expect(decodeCqfCqlTextSetting({ Debug: { DecodeCqfCqlText: false } })).toBe(true);
	});
});
