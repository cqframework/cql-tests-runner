#!/usr/bin/node

const os = require('os');
const fs = require('fs');
const path = require('path');
const ConfigLoader = require('./configLoader');
const config = new ConfigLoader();
const loadTests = require('./loadTests');
const { generateEmptyResults } = require('./resultsShared');

async function main() {

    const tests = loadTests.load();
    // Set this to true to run only the first group of tests
    const quickTest = config.Debug.QuickTest
    const emptyResults = await generateEmptyResults(tests, quickTest);

    const skipMap = config.skipListMap();


    for (let testFile of emptyResults) {
        await generateLibrariesFromTests(testFile, skipMap);
    }

}

main();


async function generateLibrariesFromTests(group, skipMap) {
    if (!group || group.length === 0) return;

    const cqlFileVersion = config.Build.CqlFileVersion;
    const cqlOutputPath = config.Build.CqlOutputPath;

    let testsName = '';
    let body = '';

    for (let r of group) {
        if (!testsName) {
            testsName = r.testsName;
        }

        if (r.invalid !== 'semantic') {
            const defineVal = `define "${r.groupName}.${r.testName}": ${r.expression}`;
            const key = `${r.testsName}-${r.groupName}-${r.testName}`;
            let reason = '';

            if (r.testStatus === 'skip') {
                console.log(`Skipping ${key}`);
                reason = "Skipped by cql-tests-runner";
            } else if (skipMap.has(key)) {
                console.log(`Skipping ${key}`);
                reason = skipMap.get(key);
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
    fs.writeFileSync(filePath, body, (error) => {
        if (error) throw error;
    });

}

