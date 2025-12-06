# Official Node image (slim variant). Adjust tag if you need a different Node version.
FROM node:20-bullseye-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package manifests first for better caching
COPY package*.json ./

# Install dependencies. Use npm ci when a lockfile exists for reproducible builds.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --production; fi

# Copy application source
COPY . .

# Ensure temp directory exists and is writable by the unprivileged user
RUN mkdir -p /usr/src/app/temp && chown -R node:node /usr/src/app

# Run as the unprivileged node user
USER node

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

CMD ["node", "./mbuvi.js"]
FROM node:20-bullseye

RUN apt-get update && apt-get install -y

WORKDIR /app

COPY package*.json ./

RUN npm install install --legacy-peer-deps

COPY . .
RUN mkdir -p /usr/src/app/temp && chown -R node:node /usr/src/app
CMD ["node", "mbuvi.js"]
