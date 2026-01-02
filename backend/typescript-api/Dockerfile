FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and tsconfig
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port 8000 (Koyeb default)
EXPOSE 8000

# Start the production server
CMD ["npm", "start"]