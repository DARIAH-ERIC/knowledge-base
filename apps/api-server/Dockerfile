FROM node:24-slim AS base

# build
FROM base AS build
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm prune --production

# serve
FROM base AS serve
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=build --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=hono:nodejs /app/dist /app/dist
COPY --from=build --chown=hono:nodejs /app/package.json /app/package.json

USER hono
EXPOSE 3000

CMD ["node", "/app/index.mjs"]
