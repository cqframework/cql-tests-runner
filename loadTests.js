const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// Load tests
const testsPath = 'cql-tests/tests/cql';

const alwaysArray = [
    "tests.group",
    "tests.group.test"
];
    
const options = {
    ignoreAttributes : false,
    attributeNamePrefix : '',
    parseTagValue : false,
    isArray: (name, jpath, isLeafNode, isAttribute) => { 
        if(alwaysArray.indexOf(jpath) !== -1) return true;
    },
    textNodeName : 'text'
};
const parser = new XMLParser(options);
const tests = [];
fs.readdirSync(testsPath).forEach(file => {
    console.log('Loading tests from ' + file);
    let testsContainer = parser.parse(fs.readFileSync(path.join(testsPath, file)));
    tests[tests.length] = testsContainer.tests;
/*
    let tests = testsContainer.tests;
    console.log('Container: ' + tests.name);
    let groups = tests.group;
//    let group = groups[0];
//    console.log(group.name);
    groups.forEach(group => {
        console.log('    Group: ' + group.name);
        let tests = group.test;
        if (tests != null) {
            tests.forEach(test => {
                console.log('        Test: ' + test.name);
            });
        };
    });
*/
});

module.exports = {
    tests
}