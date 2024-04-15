# cql-tests-runner
Test Runner for the [CQL Tests](https://github.com/cqframework/cql-tests) repository. This node application allows you to run the tests in the CQL Tests repository against a server of your choice using the [$cql](https://hl7.org/fhir/uv/cql/1.0.0-snapshot/OperationDefinition-cql-cql.html) operation.

The application runs all the tests in the repository and outputs the results as a JSON file in the `results` directory. If the output directory does not exist, it will be created.

## Setting up the Environment

This application requires Node v21 or above (to make use of the `fetch` API). [Node Download](https://nodejs.org/en/download)

Install the application using

```
npm install
```

### Environment Variables
Environment variables are set in the environment/global.json file:
 
    {{basicUser}} -- your user name on the server being tested.
    {{basicPass}} -- your password on the server to be tested.
    {{serverUrl}} -- the url of the FHIR CQL server to be tested.



