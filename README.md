# cql-tests-runner

Test Runner for the [CQL Tests](https://github.com/cqframework/cql-tests) repository. This node application allows you to run the tests in the CQL Tests repository against a server of your choice using the [$cql](https://hl7.org/fhir/uv/cql/1.0.0-snapshot/OperationDefinition-cql-cql.html) operation.

The application runs all the tests in the repository and outputs the results as a JSON file in the `results` directory. If the output directory does not exist, it will be created.

## Setting up the Environment

This application requires Node v18 and makes use of the [Axios](https://axios-http.com/docs/intro) framework for HTTP request/response processing. [Node Download](https://nodejs.org/en/download)

Install the application using

```
npm install
```

### CQL Tests Submodule

The cql-tests folder has been added as a submodule. After pulling, you'll find a cql-tests folder inside cql-tests-runner. However, when you peek inside that folder, depending on your Git version, you might see nothing. Newer versions of Git will handle this automatically, but older versions may require you to explicitly instruct Git to download the contents of cql-tests.

```
git submodule update --init --recursive
```

### Configuration Settings

Configuration settings are set in a configuration file using NPM [NPM config](https://www.npmjs.com/package/config) functionality. The file config/development.json provides a sample.

```
{
    "FhirServer": {
      "BaseUrl": "https://fhirServerBaseUrl",
      "CqlOperation": "$cql"
    },
    "Tests": {
      "ResultsPath": "./results"
    },
    "Debug": {
      "QuickTest": true
    }
}
```

Copy this file to a new name and make appropriate modifications to the values within. An example would be `production.json`.

### Running the tests

Run the tests with the following commands:

```
node cql-tests-runner.js
```

or when using a custom configuration file:

```
$ export NODE_ENV=production
$ node cql-tests-runner.js
```

```
set NODE_ENV=production && node cql-tests-runner.js
```

Alternatively the values can be passed in at run-time:

```
$ export SERVER_BASE_URL=http://fhirServerBaseEndpoint
$ export CQL_OPERATION=$cql
$ node cql-tests-runner.js
```

```
set SERVER_BASE_URL=http://fhirServerBaseEndpoint && set CQL_OPERATION=$cql && node cql-tests-runner.js
```

### Development Environment

If using vscode for development, below are some examples for running the tests using environment variables:

```
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Prod Config",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}\\cql-tests-runner.js",
      "env": {
        "NODE_ENV": "production"
      },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch EnvParams",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}\\cql-tests-runner.js",
      "env": {
        "SERVER_BASE_URL": "http://localhost:3000"
      }
    },
```

### Unit Testing

Unit testing of the cql-test-runner is implemented with [Vitest](https://vitest.dev/).

_This is for only testing of the cql-test-runner logic, and not for testing FHIR operations._

Test cases are stored in the `<root>/__tests__` folder.

##### Executing Unit Tests

Unit tests can be run from the command line using the following

```
$ npm run unit-tests
```
