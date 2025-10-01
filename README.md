# cql-tests-runner

Test Runner for the [CQL Tests](https://github.com/cqframework/cql-tests) repository. This node application allows you to run the tests in the CQL Tests repository against a server of your choice using the [$cql](https://hl7.org/fhir/uv/cql/OperationDefinition-cql-cql.html) operation. The runner in its current state uses only this operation, and there is no expectation of any other FHIR server capability made by this runner. Additional capabilities may be required in the future as we expand the runner to support full Library/$evaluate as well, but currently on the $cql operation is required, and none of the tests in the repository have any expectation of being able to access data (i.e. the tests have no retrieve expressions).

The application runs all the tests in the repository and outputs the results as a JSON file in the `results` directory. If the output directory does not exist, it will be created.

Results output from running these tests can be posted to the [CQL Tests Results](https://github.com/cqframework/cql-tests-results) repository.

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

Configuration settings are set in a JSON configuration file. The file `conf/localhost.json` provides a sample configuration.

```
{
    "FhirServer": {
      "BaseUrl": "https://fhirServerBaseUrl",
      "CqlOperation": "$cql"
    },
    "Build": {
      "CqlFileVersion": "1.0.000",
      "CqlOutputPath": "./cql"
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

Create your own configuration file and reference it when running the commands. You can copy `conf/localhost.json` to create a new configuration file with your desired settings.

### Running the tests

The CLI now requires a configuration file path as an argument. Run the tests with the following commands:

#### Build CQL Libraries
```bash
# Using npm scripts (recommended)
npm run dev:build                    # Development build
npm run build-libs                   # Production build

# Direct CLI usage
cql-tests build-cql conf/localhost.json
node dist/bin/cql-tests.js build-cql conf/localhost.json
```

#### Run CQL Tests
```bash
# Using npm scripts (recommended)
npm run dev:run                      # Development run
npm run test                         # Production run

# Direct CLI usage
cql-tests run-tests conf/localhost.json
node dist/bin/cql-tests.js run-tests conf/localhost.json
```

#### Using Custom Configuration Files
```bash
# Create your own config file
cp conf/localhost.json conf/my-config.json
# Edit conf/my-config.json with your settings

# Use your custom config
cql-tests build-cql conf/my-config.json
cql-tests run-tests conf/my-config.json
```

#### Environment Variable Overrides
You can still override specific settings using environment variables:
```bash
export SERVER_BASE_URL=http://fhirServerBaseEndpoint
export CQL_OPERATION=$cql
cql-tests run-tests conf/localhost.json
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

### Running from Source

To run the application directly from source without building:

```bash
# Install dependencies
npm install

# Initialize the cql-tests submodule
git submodule update --init --recursive

# Run commands directly from source
npm run dev:build                    # Build CQL libraries
npm run dev:run                      # Run CQL tests
npm run dev:watch                    # Watch mode for development
```

### Running with Docker

The application is available as a pre-built Docker image `hlseven/quality-cql-tests-runner:latest`.

#### Using the Docker Image

```bash
# Run CQL tests with a configuration file
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results \
  hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json

# Build CQL libraries
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/cql:/app/cql \
  hlseven/quality-cql-tests-runner:latest build-cql conf/localhost.json

# Start the server mode
docker run --rm -p 3000:3000 -v $(pwd)/conf:/app/conf \
  hlseven/quality-cql-tests-runner:latest server

# Using host networking to test against a server running on the host machine
docker run --rm --network host -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results \
  hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json
```

#### Building the Docker Image

```bash
# Build the Docker image locally
docker build -t cql-tests-runner .

# Build multi-platform image for distribution
docker buildx build --platform linux/arm64,linux/amd64 -t hlseven/quality-cql-tests-runner:latest .

# Run with built image
docker run --rm -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json results

# Using host networking with built image
docker run --rm --network host -v $(pwd)/conf:/app/conf -v $(pwd)/results:/app/results hlseven/quality-cql-tests-runner:latest run-tests conf/localhost.json results
```

### Server Command

The server command starts an Express HTTP server that provides a REST API for running CQL tests.

#### Starting the Server

```bash
# Using npm scripts (development mode)
node --import tsx src/bin/cql-tests.ts server

# Direct CLI usage
cql-tests server
cql-tests server --port 3000

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
- **POST /** - Run CQL tests with configuration in request body
- **GET /health** - Health check endpoint

#### Example Usage

```bash
# Start the server
cql-tests server --port 3000

# In another terminal, run tests via API
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d @conf/localhost.json \
  -o results.json

# Check server health
curl http://localhost:3000/health
```

The server accepts a configuration object in the request body and returns the test results as JSON.

### Unit Testing

Unit testing is implemented with [Vitest](https://vitest.dev/). _This is for only testing of the cql-test-runner logic, and not for testing FHIR operations._

Test cases are stored in the `test/` folder.

##### Executing Unit Tests

Unit tests can be run from the command line using the following

```
$ npm run unit-tests
```
