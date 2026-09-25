/**
 * Whether to decode `cqf-cqlText` interval results (see CqlTextIntervalExtractor — a
 * CQF-specific workaround, not part of the CQL specification). DECODE_CQF_CQLTEXT
 * overrides the config value; the default is on.
 */
export function decodeCqfCqlTextSetting(configData: any): boolean {
	if (process.env.DECODE_CQF_CQLTEXT !== undefined) {
		return process.env.DECODE_CQF_CQLTEXT === 'true';
	}

	const configValue = configData.Debug?.DecodeCqfCqlText;
	if (configValue !== undefined) {
		return configValue as boolean;
	}

	return true;
}
