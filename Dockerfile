FROM node:22-alpine AS backend-build

WORKDIR /app

COPY Backend/package.json Backend/package-lock.json ./
RUN npm ci

COPY Backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS backend

ENV NODE_ENV=production
WORKDIR /app

COPY --from=backend-build --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/package.json ./package.json
COPY --from=backend-build --chown=node:node /app/dist ./dist
COPY --from=backend-build --chown=node:node /app/migrations ./migrations

USER node
EXPOSE 3000
CMD ["node", "dist/app.js"]

FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci

COPY Frontend/ ./
ARG VITE_API_URL=
ARG VITE_NEON_AUTH_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_NEON_AUTH_URL=${VITE_NEON_AUTH_URL}
RUN npm run build

FROM nginx:1.27-alpine AS frontend

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80