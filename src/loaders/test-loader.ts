import * as fs from 'fs';
import * as path from 'path';
import { XMLParser, type X2jOptions } from 'fast-xml-parser';
import { Tests } from '../models/test-types.js';

const testsPath = process.env.CQL_TESTS_PATH || 'cql-tests/tests/cql';

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
		// Only .xml files hold test definitions. The tests directory also accumulates
		// reference material (spec extracts, scratch files) and subdirectories, and handing
		// any of those to the XML parser aborts the entire run rather than skipping the file.
		fs.readdirSync(testsPath)
			.filter(file => file.toLowerCase().endsWith('.xml'))
			.forEach(file => {
				console.log('Loading tests from ' + file);
				const testsContainer = parser.parse(fs.readFileSync(path.join(testsPath, file)));
				tests.push(testsContainer.tests);
			});

		return tests;
	}
}
