# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs20
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run provides $PORT (defaults to 8080). Your app reads PORT in config.ts
ENV PORT=8080

# Copy runtime artifacts only
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/.config ./.config

# Non-root for security in Cloud Run
USER nonroot

EXPOSE 8080

# Distroless nodejs images expect the JS entry as the command
CMD ["dist/server.js"]