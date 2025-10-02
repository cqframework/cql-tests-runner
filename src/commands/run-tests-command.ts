import { TestRunner } from '../services/test-runner';
import { ConfigLoader } from '../conf/config-loader';

// Type declaration for CVL loader
declare const cvlLoader: () => Promise<[{ default: any }]>;

export class RunCommand {
  private testRunner: TestRunner;

  constructor() {
    this.testRunner = new TestRunner();
  }

  async execute(options: { config: string; output: string; validate?: boolean }): Promise<void> {
    const config = new ConfigLoader(options.config);
    const outputPath = options.output || config.Tests.ResultsPath;

    // Convert ConfigLoader to the format expected by TestRunner
    const configData = this.convertConfigToData(config);

    // Run tests using the shared TestRunner with axios for backward compatibility
    const results = await this.testRunner.runTests(configData, {
      useAxios: true // Use axios for backward compatibility with existing behavior
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

    results.save(outputPath);
    
    // Always run validation after saving (existing behavior)
    await results.validate();
  }

  private convertConfigToData(config: ConfigLoader): any {
    return {
      FhirServer: {
        BaseUrl: config.FhirServer.BaseUrl,
        CqlOperation: config.FhirServer.CqlOperation
      },
      Build: {
        CqlFileVersion: config.Build.CqlFileVersion,
        CqlOutputPath: config.Build.CqlOutputPath
      },
      Tests: {
        ResultsPath: config.Tests.ResultsPath,
        SkipList: config.Tests.SkipList
      },
      Debug: {
        QuickTest: config.Debug.QuickTest
      }
    };
  }

}
