# cql-tests-runner

Test Runner for the [CQL Tests](https://github.com/cqframework/cql-tests) repository. This node application allows you to run the tests in the CQL Tests repository against a server of your choice using the [$cql](https://hl7.org/fhir/uv/cql/OperationDefinition-cql-cql.html) operation. The runner in its current state uses only this operation, and there is no expectation of any other FHIR server capability made by this runner. Additional capabilities may be required in the future as we expand the runner to support full Library/$evaluate as well. None of the tests in the repository have any expectation of being able to access data (i.e. the tests have no retrieve expressions).

The application runs all the tests in the repository and outputs the results as a JSON file in the `results` directory. If the output directory does not exist, it will be created.

Results output from running these tests can be posted to the [CQL Tests Results](https://github.com/cqframework/cql-tests-results) repository.

## Setting up the Environment

This application requires Node v24 and makes use of the [Axios](https://axios-http.com/docs/intro) framework for HTTP request/response processing. [Node Download](https://nodejs.org/en/download)

Install application dependencies using

```
npm install
```

### CQL Tests Submodule

The cql-tests folder has been added as a submodule. After pulling, you'll find a cql-tests folder inside cql-tests-runner. However, when you peek inside that folder, depending on your Git version, you might see nothing. Newer versions of Git will handle this automatically, but older versions may require you to explicitly instruct Git to download the contents of cql-tests.

```
git submodule update --init --recursive
```

### Configuration Settings

Configuration settings are set in a JSON configuration file. The file `conf/localhost.json` provides a sample configuration.

```
{
    "FhirServer": {
      "BaseUrl": "https://fhirServerBaseUrl",
      "CqlOperation": "$cql"
    },
    "Build": {
      "CqlFileVersion": "1.0.000",
      "CqlOutputPath": "./cql",
      "testsRunDescription": '',
      "testsRunDescription": "Local host test run",
      "cqlTranslator": "Java CQFramework Translator",
      "cqlTranslatorVersion": "Unknown",
      "cqlEngine": "Java CQFramework Engine",
      "cqlEngineVersion": "4.1.0"
    },
    "Tests": {
      "ResultsPath": "./results",
      "SkipList": []
    },
    "Debug": {
      "QuickTest": true
    }
}
```

Create your own configuration file and reference it when running the commands. You can use `conf/localhost.json` as a template for a new configuration with your own settings.

### Running the tests

The CLI now requires a configuration file path as an argument. Run the tests with the following commands:

#

### Running from Source Code

To run the application directly from source:

```bash
# Install dependencies
npm install

# Initialize the cql-tests submodule
git submodule update --init --recursive

# Run commands directly from TypeScript source
npx tsx src/bin/cql-tests.ts run-tests conf/localhost.json ./results # Run CQL tests
npx tsx src/bin/cql-tests.ts run-tests conf/localhost.json ./results --quick # Run with quick test mode enabled
npx tsx src/bin/cql-tests.ts server                               # Run in server API mode
npx tsx src/bin/cql-tests.ts help                               # Hetailed command help

npx tsx src/bin/cql-tests.ts build-cql conf/localhost.json ./cql    # Unused legacy tool

```

### Running from Pre-Built OCI/Docker Image

The application is available as the pre-built image tag `hlseven/quality-cql-tests-runner:latest`.

#### Using the Docker Image

By default, the image runs the CLI. When you bind in any local directories (such as configuration and results directories) you may use it as you would any other command line utility.

```bash
# Run CQL tests with a configuration file
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results \
  hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json ./results

# Run CQL tests with quick test mode enabled
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results \
  hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json ./results --quick

# Build CQL libraries (Unused)
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/cql:/app/cql \
  hlseven/quality-cql-tests-runner:latest build-cql conf/localhost.json ./cql

# Start in REST server mode listening on port 3000.
docker run --rm -p 3000:3000 -v $(pwd)/conf:/app/conf \
  hlseven/quality-cql-tests-runner:latest server

# Using host networking to test against a server running on the host machine
docker run --rm --network host -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results \
  hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json ./results
```

#### Building the Docker Image

```bash
# Build the Docker image locally
docker build -t cql-tests-runner .

# Build multi-platform image for distribution
docker buildx build --platform linux/arm64,linux/amd64 -t hlseven/quality-cql-tests-runner:latest .

# Run with built image
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json ./results

# Using host networking with built image
docker run --rm --network host -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json ./results
```

#### Environment Variable Overrides

You can still override specific settings using environment variables:

```sh
export SERVER_BASE_URL=http://fhirServerBaseEndpoint
export CQL_OPERATION=$cql
```

### Development Environment

If using vscode for development, below are some examples for running the tests with configuration files:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Launch Build Command",
  "skipFiles": ["<node_internals>/**"],
  "program": "${workspaceFolder}/src/bin/cql-tests.ts",
  "args": ["build-cql", "conf/localhost.json"],
  "runtimeArgs": ["--import", "tsx"]
},
{
  "type": "node",
  "request": "launch",
  "name": "Launch Run Command",
  "skipFiles": ["<node_internals>/**"],
  "program": "${workspaceFolder}/src/bin/cql-tests.ts",
  "args": ["run-tests", "conf/localhost.json"],
  "runtimeArgs": ["--import", "tsx"],
  "env": {
    "SERVER_BASE_URL": "http://localhost:3000"
  }
}
```

### Server Command

The server command starts an HTTP server that provides a REST API for running CQL tests. This is mainly intended to be used by [CQL Tests UI](https://github.com/cqframework/cql-tests-ui)

#### Starting the Server

```bash
# Using tsx (development mode)
npx tsx src/bin/cql-tests.ts server

# Using Docker
docker run --rm -p 3000:3000 -v $(pwd)/conf:/app/conf \
  hlseven/quality-cql-tests-runner:latest server

# Using Docker with host networking
docker run --rm --network host -v $(pwd)/conf:/app/conf \
  hlseven/quality-cql-tests-runner:latest server
```

#### Using the Server API

The server provides the following endpoints:

- **GET /** - Server information and available endpoints
- **POST /** - Run CQL tests with configuration in request body (synchronous)
- **POST /jobs** - Create a new job to run CQL tests asynchronously
- **GET /jobs/:id** - Get job status and results by job ID
- **GET /health** - Health check endpoint

#### Asynchronous Job Processing

For long-running test suites, the server supports asynchronous job processing:

```bash
# Create a job (returns immediately with job ID)
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d @conf/localhost.json

# Poll job status and results
curl http://localhost:3000/jobs/{job-id}
```

Jobs support progress tracking and can be polled for status updates. The original synchronous endpoint (`POST /`) remains available for quick tests.

#### Example Usage

```bash
# Start the server
npx tsx src/bin/cql-tests server --port 3000

# In another terminal, run tests via synchronous execution API
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d @conf/localhost.json \
  -o results.json

# Check server health
curl http://localhost:3000/health
```

The server accepts a configuration object in the request body and returns the test results as JSON.

### MCP (Model Context Protocol) Support for AI and Agentic Clients

The server exposes MCP endpoints using Streamable HTTP transport, enabling AI agents to discover and interact with the CQL tests runner autonomously.

#### Using the MCP Inspector

To explore the MCP features of your running server, use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) with Streamable HTTP transport:

```bash
# Run the inspector
npx @modelcontextprotocol/inspector --server-url http://localhost:3000/mcp --transport http
```

Connection Type should be set to "Via Proxy".

The inspector provides an interactive UI to browse test resources, view schemas, and invoke tools for running tests and managing jobs.

### Unit Testing

Unit testing is implemented with [Vitest](https://vitest.dev/). _This is for only testing of the cql-test-runner logic, and not for testing FHIR operations._

Test cases are stored in the `test/` folder.

##### Executing Unit Tests

Unit tests can be run from the command line using the following

```
$ npm run unit-tests
```
