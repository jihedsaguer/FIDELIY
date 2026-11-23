# Multi-stage frontend image.
#   dev  - docker-compose.yml (Vite dev server on 5173, as before)
#   prod - local production-like smoke test only (docker-compose.prod.yml):
#          static build served by nginx, /api proxied to the backend.
#          Real deployment serves dist/ from Cloudflare Workers static assets.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
