# ===== Stage 1: Build =====
FROM node:24-bullseye AS builder
WORKDIR /usr/src/app

# Copy package files and install all deps (including dev)
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

# Copy only needed files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose app port
EXPOSE 3000

# Start the server
CMD ["node", "dist/main.js"]
