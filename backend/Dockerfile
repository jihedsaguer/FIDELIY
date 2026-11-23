# Multi-stage backend image.
#   dev     - docker-compose.yml (NODE_ENV=development, keeps src/ so the
#             backend auto-applies migrations on start, as before)
#   runtime - production (Render, docker-compose.prod.yml). Default target.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
# tsc: src/ -> dist/ (entry dist/main.js)
RUN npm run build

FROM build AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "start"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# migrate.js reads ./src/database/migrations relative to the working directory:
#   node dist/database/migrate.js
COPY src/database/migrations ./src/database/migrations
# Logo storage (LocalStorageAdapter). Ephemeral on Render free (accepted).
RUN mkdir -p /data/logos && chown node:node /data/logos
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
