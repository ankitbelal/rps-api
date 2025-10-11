FROM node:24-bullseye AS builder
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

FROM node:24-bullseye
WORKDIR /usr/src/app

# Copy build artifacts and dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Expose port
EXPOSE 3000

# Run the production build
CMD ["npm", "run", "start:prod"]
