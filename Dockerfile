FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/

# Image core — no plugins
FROM base AS core
ENV PORT=3000 HOST=0.0.0.0 LOG_LEVEL=info STRICT=true
EXPOSE 3000
CMD ["node", "dist/standalone.js"]

# Image full — fiscal + jsonlogic
FROM base AS full
RUN npm install @run-iq/plugin-fiscal@^0.1.1 @run-iq/dsl-jsonlogic@^0.1.1
ENV PORT=3000 HOST=0.0.0.0 LOG_LEVEL=info STRICT=true PLUGINS=fiscal DSLS=jsonlogic
EXPOSE 3000
CMD ["node", "dist/standalone.js"]
