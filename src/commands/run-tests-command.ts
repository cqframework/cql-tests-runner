import { TestRunner } from '../services/test-runner';
import { ConfigLoader } from '../conf/config-loader.js';

// Type declaration for CVL loader
declare const cvlLoader: () => Promise<[{ default: any }]>;

export class RunCommand {
	private testRunner: TestRunner;

	constructor() {
		this.testRunner = new TestRunner();
	}

	async execute(options: { config: string; output: string; validate?: boolean; quick?: boolean }): Promise<void> {
		const config = new ConfigLoader(options.config);
		const outputPath = options.output || config.Tests.ResultsPath;

		// Convert ConfigLoader to the format expected by TestRunner
		const configData = this.convertConfigToData(config, options.quick);

		// Run tests using the shared TestRunner with axios for backward compatibility
		const results = await this.testRunner.runTests(configData, {
			useAxios: true, // Use axios for backward compatibility with existing behavior
		});

		// Validate before saving if validation option is enabled
		if (options.validate) {
			console.log('Validating results before saving...');
			const isValid = await results.validate();
			if (isValid) {
				console.log('Results file validation passed');
			} else {
				console.log('Results file validation failed, but continuing to save file...');
			}
		}
		results._testsRunDescription = configData.Build.testsRunDescription;
		results.save(outputPath);

		// Always run validation after saving (existing behavior)
		await results.validate();
	}

	private convertConfigToData(config: ConfigLoader, quick?: boolean): any {
		return {
			FhirServer: {
				BaseUrl: config.FhirServer.BaseUrl,
				CqlOperation: config.FhirServer.CqlOperation,
			},
			Build: {
				CqlFileVersion: config.Build.CqlFileVersion,
				CqlOutputPath: config.Build.CqlOutputPath,
				CqlVersion: config.Build.CqlVersion,
				testsRunDescription: config.Build?.testsRunDescription,
				cqlTranslator: config.Build?.cqlTranslator,
				cqlTranslatorVersion: config.Build?.cqlTranslatorVersion,
				cqlEngine: config.Build?.cqlEngine,
				cqlEngineVersion: config.Build?.cqlEngineVersion
			},
			Tests: {
				ResultsPath: config.Tests.ResultsPath,
				SkipList: (() => {
					const env = process.env.SKIP_LIST;
					if (env !== undefined) {
						try {
							const parsed = JSON.parse(env);
							return Array.isArray(parsed) ? parsed : [];
						} catch {
							console.warn(
								'Failed to parse SKIP_LIST environment variable. Falling back to SkipList in config file.'
							);
						}
					}
					return config.Tests.SkipList;
				})(),
				OnlyList: (() => {
					const env = process.env.ONLY_LIST;
					if (env !== undefined) {
						try {
							const parsed = JSON.parse(env);
							return Array.isArray(parsed) ? parsed : [];
						} catch {
							console.warn(
								'Failed to parse ONLY_LIST environment variable. Falling back to OnlyList in config file.'
							);
						}
					}
					return config.Tests.OnlyList || [];
				})()
			},
			Debug: {
				QuickTest: quick !== undefined ? quick : config.Debug.QuickTest,
			},
		};
	}
}
