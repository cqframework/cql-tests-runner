import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { Tests } from '../models/test-types.js';

const testsPath = 'cql-tests/tests/cql';

const alwaysArray = ['tests.group', 'tests.group.test'];

const options = {
	ignoreAttributes: false,
	attributeNamePrefix: '',
	parseTagValue: false,
	isArray: (name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean): boolean => {
		return alwaysArray.indexOf(jpath) !== -1;
	},
	textNodeName: 'text',
};

const parser = new XMLParser(options);

export class TestLoader {
	static load(): Tests[] {
		const tests: Tests[] = [];
		fs.readdirSync(testsPath).forEach(file => {
			console.log('Loading tests from ' + file);
			const testsContainer = parser.parse(fs.readFileSync(path.join(testsPath, file)));
			tests.push(testsContainer.tests);
		});

		return tests;
	}
}
