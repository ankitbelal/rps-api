# ===== Stage 1: Builder =====
FROM node:24-bullseye AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (dev + prod)
RUN npm ci

# Copy all source code
COPY . .

# Build the NestJS app (outputs to dist/)
RUN npm run build

# ===== Stage 2: Production =====
FROM node:24-slim

# Set working directory (match the builder output copy path)
WORKDIR /usr/src/app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy only package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built app from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]
