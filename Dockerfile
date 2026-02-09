# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run --filter "./packages/*" build

FROM build AS api-build
RUN pnpm run --filter api build
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter api --config.inject-workspace-packages=true --prod /out

FROM base AS api
USER node
WORKDIR /app
COPY --from=api-build /out/node_modules/ /app/node_modules/
COPY --from=api-build /out/public/ /app/public/
COPY --from=api-build /out/dist/ /app/dist/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./dist/index.mjs" ]

FROM build AS knowledge-base-build
ENV ENV_VALIDATION="public"
ARG NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_APP_IMPRINT_CUSTOM_CONFIG
ARG NEXT_PUBLIC_APP_IMPRINT_SERVICE_BASE_URL
ARG NEXT_PUBLIC_APP_MATOMO_BASE_URL
ARG NEXT_PUBLIC_APP_MATOMO_ID
ARG NEXT_PUBLIC_APP_SERVICE_ID
ARG NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME
ARG NEXT_PUBLIC_TYPESENSE_HOST
ARG NEXT_PUBLIC_TYPESENSE_PORT
ARG NEXT_PUBLIC_TYPESENSE_PROTOCOL
RUN pnpm run --filter knowledge-base build
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter knowledge-base --config.inject-workspace-packages=true --prod /out

FROM base AS knowledge-base
USER node
WORKDIR /app
COPY --from=knowledge-base-build /out/node_modules/ /app/node_modules/
COPY --from=knowledge-base-build /out/public/ /app/public/
COPY --from=knowledge-base-build /out/next.config.ts /app/next.config.ts
COPY --from=knowledge-base-build /out/.next/standalone/ /app/.next/standalone/
COPY --from=knowledge-base-build /out/.next/static/ /app/.next/static/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./server.js" ]
