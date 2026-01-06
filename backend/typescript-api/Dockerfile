FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Install dependencies (including dev for build)
RUN npm install

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Expose port
EXPOSE 8080

# Start with Render's PORT environment variable
CMD ["sh", "-c", "PORT=${PORT:-8080} node dist/index.js"]