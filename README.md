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
		"CqlVersion": "1.5",
		"testsRunDescription": "Local host test run",
		"cqlTranslator": "Java CQFramework Translator",
		"cqlTranslatorVersion": "Unknown",
		"cqlEngine": "Java CQFramework Engine",
		"cqlEngineVersion": "4.1.0",
		"SERVER_OFFSET_ISO": "-06:00",
		"TimeZoneOffsetPolicy": "timezone-offset-policy.default-server-offset"
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

### Time Zone Configuration

The CQL Tests Runner uses two settings to control how **DateTime** values are evaluated:

- `SERVER_OFFSET_ISO`
- `TimeZoneOffsetPolicy`

These settings are required because CQL allows **DateTime values without a timezone offset**, and different engines interpret those values differently. Without explicitly setting these, tests involving DateTime comparison and extraction may produce inconsistent results (pass, fail, or null).

Reference: http://cql.hl7.org/CodeSystem/cql-language-capabilities

---

#### TimeZoneOffsetPolicy (what it means)

A DateTime like this:

```cql
@2012-04-01T00:00
```

has **no timezone offset**.

When a CQL engine evaluates this, it must decide:

👉 Should this value be treated as having a timezone, or not?

That decision is the **timezone offset policy**.

---

#### Supported policies

##### `timezone-offset-policy.default-server-offset`

Offset-less DateTime values are interpreted using the server’s timezone.

Example (with `SERVER_OFFSET_ISO = -06:00`):

```cql
@2012-04-01T00:00
```

is treated as:

```cql
@2012-04-01T00:00-06:00
```

**Result behavior:**
- DateTime comparisons behave as if all values have offsets
- Equality comparisons with explicit offsets often return **true**
- `timezoneoffset from` returns a numeric offset (e.g. `-6`)
- Tests expecting normalization to a server offset → **pass**
- Tests expecting strict offset behavior → **skip**

---

##### `timezone-offset-policy.no-default-offset`

Offset-less DateTime values remain **without a timezone**.

```cql
@2012-04-01T00:00
```

remains unchanged.

**Result behavior:**
- No timezone is assumed
- Comparisons between offset-less and offset values may return **null** or **false**
- `timezoneoffset from` returns **null**
- Tests expecting strict offset behavior → **pass**
- Tests expecting server normalization → **skip**

---

#### SERVER_OFFSET_ISO (what it does)

Provides the timezone offset value used in test expressions.

- Format: ISO 8601 offset (e.g. `-06:00`, `+00:00`, `+05:30`)
- Used when a test includes the placeholder `{{SERVER_OFFSET_ISO}}`

Example:

```cql
@2012-04-01T00:00 = @2012-04-01T00:00{{SERVER_OFFSET_ISO}}
```

With:

```json
"SERVER_OFFSET_ISO": "-06:00"
```

Becomes:

```cql
@2012-04-01T00:00 = @2012-04-01T00:00-06:00
```

---

#### How they work together

- `TimeZoneOffsetPolicy` determines **whether offset-less DateTime values get a timezone**
- `SERVER_OFFSET_ISO` provides **the timezone value used when needed**

Example:

```json
{
  "Build": {
    "SERVER_OFFSET_ISO": "-06:00",
    "TimeZoneOffsetPolicy": "timezone-offset-policy.default-server-offset"
  }
}
```

This means:
- Use `-06:00` as the server timezone
- Apply that offset to DateTime values that do not include one

---

#### How to set these values

In your configuration file:

```json
{
  "Build": {
    "SERVER_OFFSET_ISO": "-06:00",
    "TimeZoneOffsetPolicy": "timezone-offset-policy.default-server-offset"
  }
}
```

Or using an environment variable (policy only):

```bash
export TIME_ZONE_OFFSET_POLICY=timezone-offset-policy.no-default-offset
```

---

#### How the runner determines the active policy

The runner resolves `TimeZoneOffsetPolicy` in this order:

1. FHIR server metadata (CapabilityStatement)
2. Environment variable (`TIME_ZONE_OFFSET_POLICY`)
3. Configuration file (`TimeZoneOffsetPolicy`)
4. Runtime probe (detect behavior automatically)
5. Default: `timezone-offset-policy.default-server-offset`

---

#### Expected results summary

| Policy | Offset-less DateTime | timezoneoffset | Equality vs offset |
|--------|---------------------|----------------|-------------------|
| default-server-offset | gets server offset | number (e.g. `-6`) | often `true` |
| no-default-offset | remains offset-less | `null` | `null` or `false` |

---

#### Notes

- These settings do not change server behavior; they only control how the runner evaluates tests
- If the server declares a policy in metadata, it overrides configuration
- `SERVER_OFFSET_ISO` is only used where explicitly referenced in test expressions

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
