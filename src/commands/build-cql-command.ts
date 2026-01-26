import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../conf/config-loader.js';
import { TestLoader } from '../loaders/test-loader.js';
import { generateEmptyResults } from '../shared/results-shared.js';

export class BuildCommand {
	async execute(options: any): Promise<void> {
		const config = new ConfigLoader(options.config);
		const outputPath = options.output || config.Build.CqlOutputPath;
		const tests = TestLoader.load();
		const quickTest = config.Debug.QuickTest;
		const skipMap = config.skipListMap();

		console.log('Building CQL libraries from test definitions...');

		const emptyResults = await generateEmptyResults(tests, quickTest);

		for (const testFile of emptyResults) {
			await this.generateLibrariesFromTests(testFile, skipMap, config, outputPath);
		}

		console.log('CQL library generation complete!');
	}

	private async generateLibrariesFromTests(
		group: any[],
		skipMap: Map<string, string>,
		config: ConfigLoader,
		outputPath: string
	): Promise<void> {
		if (!group || group.length === 0) return;

		const cqlFileVersion = config.Build.CqlFileVersion;
		const cqlOutputPath = outputPath;

		let testsName = '';
		let body = '';

		for (const r of group) {
			if (!testsName) {
				testsName = r.testsName;
			}

			if (r.invalid !== 'semantic') {
				const defineVal = `define "${r.groupName}.${r.testName}": ${r.expression}`;
				const key = `${r.testsName}-${r.groupName}-${r.testName}`;
				let reason = '';

				if (r.testStatus === 'skip') {
					console.log(`Skipping ${key}`);
					reason = 'Skipped by cql-tests-runner';
				} else if (skipMap.has(key)) {
					console.log(`Skipping ${key}`);
					reason = skipMap.get(key) || '';
				}

				if (reason) {
					body += `/* ${os.EOL} Skipped: ${reason} ${os.EOL} ${defineVal} ${os.EOL}*/${os.EOL}${os.EOL}`;
				} else {
					body += `${defineVal}${os.EOL}${os.EOL}`;
				}
			}
		}

		if (!testsName) return;

		body = `library ${testsName} version '${cqlFileVersion}'${os.EOL}${os.EOL}${body}`;

		if (!fs.existsSync(cqlOutputPath)) {
			fs.mkdirSync(cqlOutputPath, { recursive: true });
		}

		const fileName = `${testsName}.cql`;
		const filePath = path.join(cqlOutputPath, fileName);
		fs.writeFileSync(filePath, body);

		console.log(`Generated: ${filePath}`);
	}
}
