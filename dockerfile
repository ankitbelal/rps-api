# Multi-stage build for production
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies including dev dependencies for building
RUN npm ci

# Copy source code
COPY . .

# Build the application and show output
RUN npm run build && ls -la dist/

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-audit

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Verify the copied files
RUN ls -la dist/

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]