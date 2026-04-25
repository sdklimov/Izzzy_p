# Build stage
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy dependencies from base
COPY --from=base /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package*.json ./

# Create directory for session file
RUN mkdir -p /app/data

# Run the application
CMD ["node", "src/index.js"]
