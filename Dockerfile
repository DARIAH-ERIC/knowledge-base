# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
RUN corepack enable

FROM base AS build
RUN mkdir /app && chown -R node:node /app
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run --filter "./packages/*" build
RUN pnpm run --filter dariah-knowledge-base-api-server build
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter dariah-knowledge-base-api-server --config.inject-workspace-packages=true --prod /out/api-server

FROM base AS api-server
USER node
COPY --from=build /out/api-server/node_modules/ /app/node_modules/
COPY --from=build /out/api-server/dist/ /app/dist/
WORKDIR /app
EXPOSE 3000
CMD [ "node", "./dist/index.mjs" ]
