FROM node:20-alpine

WORKDIR /app

# Copy package files AND tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code BEFORE npm install
COPY src ./src

# Install dependencies (including devDependencies for build)
RUN npm install

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]