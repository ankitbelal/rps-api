# ===== Stage 1: Build =====
FROM node:24-bullseye AS builder
WORKDIR /usr/src/app

# Copy package files and install all dependencies (dev + prod)
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the app (creates /dist)
RUN npm run build

# ===== Stage 2: Production =====
FROM node:24-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev  # or `npm install --omit=dev` if no lockfile

# Copy built app
COPY --from=builder /usr/src/app/dist ./dist

# Debug: verify dist contents
RUN ls -R /usr/src/app/dist

# Expose app port
EXPOSE 3000

# Start the server
CMD ["node", "dist/main.js"]
