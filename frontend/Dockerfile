# Build estático (Angular) — servido com Node (`serve`), alinhado a UPSTREAM_FRONTEND :4200 no gateway.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist/frontend/browser ./public

ENV NODE_ENV=production

EXPOSE 4200

# -s: SPA fallback (Angular router); -l: porta esperada pelo gateway (http://frontend:4200)
CMD ["serve", "-s", "public", "-l", "4200", "--no-port-switching"]
