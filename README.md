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

### Environment Variables
Environment variables are set in the environment/global.json file:
 
    {{basicUser}} -- your user name on the server being tested.
    {{basicPass}} -- your password on the server to be tested.
    {{serverUrl}} -- the url of the FHIR CQL server to be tested.

### Running the tests
Run the tests with the following command:

```
node cql-tests-runner.js
```

