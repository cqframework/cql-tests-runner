# Use Node.js v25 as the base image
FROM node:25-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code and configuration
COPY . .

# Install dev dependencies for building
RUN npm i

# Build TypeScript to JavaScript
RUN npm run build

# Copy assets and CVL to dist directory
RUN cp -r assets dist/
RUN cp -r cvl dist/

# Run the build-cql subcommand to generate CQL libraries
RUN node dist/src/bin/cql-tests.js build-cql conf/localhost.json ./cql

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cql-tests -u 1001

# Change ownership of the app directory to the non-root user
RUN chown -R cql-tests:nodejs /app
USER cql-tests

# Expose port for server
EXPOSE 3000

# Set the entrypoint to run the compiled cql-tests.js
# The Node.js process will handle SIGINT/SIGTERM signals for graceful shutdown
ENTRYPOINT ["node", "dist/src/bin/cql-tests.js"]
