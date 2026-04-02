import * as fs from 'fs';
import * as path from 'path';
import { XMLParser, type X2jOptions } from 'fast-xml-parser';
import { Tests } from '../models/test-types.js';

const testsPath = 'cql-tests/tests/cql';

const alwaysArray = ['tests.group', 'tests.group.test'];

const options: X2jOptions = {
	ignoreAttributes: false,
	attributeNamePrefix: '',
	parseTagValue: false,
	isArray: (name, jPathOrMatcher, isLeafNode, isAttribute) =>
		typeof jPathOrMatcher === 'string' && alwaysArray.indexOf(jPathOrMatcher) !== -1,
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
