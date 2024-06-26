# cql-tests-runner
Test Runner for the [CQL Tests](https://github.com/cqframework/cql-tests) repository. This node application allows you to run the tests in the CQL Tests repository against a server of your choice using the [$cql](https://hl7.org/fhir/uv/cql/1.0.0-snapshot/OperationDefinition-cql-cql.html) operation.

The application runs all the tests in the repository and outputs the results as a JSON file in the `results` directory. If the output directory does not exist, it will be created.

## Setting up the Environment

This application requires Node v20 and makes use of the [Axios](https://axios-http.com/docs/intro) framework for HTTP request/response processing. [Node Download](https://nodejs.org/en/download)

Install the application using

```
npm install
```

### CQL Tests Submodule
The cql-tests folder has been added as a submodule. After pulling, you'll find a cql-tests folder inside cql-tests-runner. However, when you peek inside that folder, depending on your Git version, you might see nothing. Newer versions of Git will handle this automatically, but older versions may require you to explicitly instruct Git to download the contents of cql-tests.
```
git submodule update --init --recursive
```

### Environment Variables
Environment variables are set in an environment file. The file .development.env provides a sample.
 
```
SERVER_BASE_URL=http://fhirServerBaseEndpoint
CQL_ENDPOINT=$cql
OUTPUT_PATH=./results
```
Copy this file to a new name and make appropriate modifications to the values within. An example would be `.env` or `.production.env`.

### Running the tests
Run the tests with the following commands:

```
node -env-file=.development.env cql-tests-runner.js
```
Alternatively the values can be passed in at run-time:
```
SERVER_BASE_URL=http://fhirServerBaseEndpoint CQL_ENDPOINT=$cql node cql-tests-runner.js
```

### Development Environment

If using vscode for development, below are some examples for running the tests using environment variables:
```
    {
      "type": "node",
      "request": "launch",
      "name": "Launch EnvFile",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}\\cql-tests-runner.js",
      "envFile": "${workspaceFolder}\\.development.env"
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

