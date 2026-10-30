# syntax=docker/dockerfile:1

# base
# -------------------------------------------------------------------------------------------------

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"
ENV CI=true
# pnpm 11 may run dependency verification before package scripts, which can fail in
# turbo-pruned Docker workspaces.
# @see {@link https://github.com/pnpm/pnpm/issues/11865}
ENV pnpm_config_verify_deps_before_run=false
# pnpm is installed with npm instead of corepack, which is deprecated and no longer bundled with
# node.js from v25. The version is supplied as a build arg (resolved from the `packageManager` field
# in CI), so the image runs the same pnpm the repo pins.
ARG PNPM_VERSION
RUN npm install --global "pnpm@${PNPM_VERSION}"
# `turbo prune` runs before `pnpm install`, so it needs a turbo binary available up front. The version
# is supplied as a build arg (resolved from the lockfile in CI) instead of installing the floating
# latest, so prune is reproducible and matches the repo turbo used via `pnpm exec turbo` in the build
# stages.
ARG TURBO_VERSION
RUN pnpm add --global "turbo@${TURBO_VERSION}"

# source
# -------------------------------------------------------------------------------------------------

FROM base AS source
WORKDIR /app
COPY . .

# =================================================================================================
# migrate
# =================================================================================================

# prune
# -------------------------------------------------------------------------------------------------

FROM source AS migrate-prune
RUN turbo prune @dariah-eric/database --docker

# install
# -------------------------------------------------------------------------------------------------

FROM base AS migrate-install
WORKDIR /app
COPY --from=migrate-prune /app/out/json/ .
COPY --from=migrate-prune /app/patches/ ./patches/
COPY --from=migrate-prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# build
# -------------------------------------------------------------------------------------------------

FROM migrate-install AS migrate-build
COPY --from=migrate-prune /app/out/full/ .
RUN --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    pnpm exec turbo run build --filter=@dariah-eric/database^...
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter @dariah-eric/database --config.inject-workspace-packages=true /out

# serve
# -------------------------------------------------------------------------------------------------

FROM base AS migrate
USER node
WORKDIR /app
COPY --chown=node:node --from=migrate-build /out/ .
CMD [ "pnpm", "run", "db:migrations:apply" ]

# =================================================================================================
# api
# =================================================================================================

# prune
# -------------------------------------------------------------------------------------------------

FROM source AS api-prune
RUN turbo prune @dariah-eric/api --docker

# install
# -------------------------------------------------------------------------------------------------

FROM base AS api-install
WORKDIR /app
COPY --from=api-prune /app/out/json/ .
COPY --from=api-prune /app/patches/ ./patches/
COPY --from=api-prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# build
# -------------------------------------------------------------------------------------------------

FROM api-install AS api-build
COPY --from=api-prune /app/out/full/ .
RUN --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    pnpm exec turbo run build --filter=@dariah-eric/api
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter @dariah-eric/api --config.inject-workspace-packages=true --prod /out

# serve
# -------------------------------------------------------------------------------------------------

FROM base AS api
USER node
WORKDIR /app
COPY --chown=node:node --from=api-build /out/node_modules/ /app/node_modules/
COPY --chown=node:node --from=api-build /out/public/ /app/public/
COPY --chown=node:node --from=api-build /out/dist/ /app/dist/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./dist/index.mjs" ]

# =================================================================================================
# app
# =================================================================================================

# prune
# -------------------------------------------------------------------------------------------------

FROM source AS app-prune
RUN turbo prune @dariah-eric/knowledge-base --docker

# install
# -------------------------------------------------------------------------------------------------

FROM base AS app-install
WORKDIR /app
COPY --from=app-prune /app/out/json/ .
COPY --from=app-prune /app/patches/ ./patches/
COPY --from=app-prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# build
# -------------------------------------------------------------------------------------------------

FROM app-install AS app-build
ARG BUILD_MODE=standalone
ARG NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_APP_BOTS
ARG NEXT_PUBLIC_APP_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_APP_IMPRINT_CUSTOM_CONFIG
ARG NEXT_PUBLIC_APP_IMPRINT_SERVICE_BASE_URL
ARG NEXT_PUBLIC_APP_MATOMO_BASE_URL
ARG NEXT_PUBLIC_APP_MATOMO_ID
ARG NEXT_PUBLIC_APP_SERVICE_ID
ARG NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME
ARG NEXT_PUBLIC_TYPESENSE_WEBSITE_COLLECTION_NAME
ARG NEXT_PUBLIC_TYPESENSE_HOST
ARG NEXT_PUBLIC_TYPESENSE_PORT
ARG NEXT_PUBLIC_TYPESENSE_PROTOCOL
ARG NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY
COPY --from=app-prune /app/out/full/ .
# Runtime secrets are not passed into the image. Next.js imports route modules while building,
# and some of them create clients from server-side environment variables on import, so the
# required ones get throwaway placeholders here. The real values are only set at runtime.
RUN --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    AUTH_ENCRYPTION_KEY="00000000000000000000000000000000" \
    DATABASE_HOST="localhost" \
    DATABASE_NAME="placeholder" \
    DATABASE_PASSWORD="placeholder" \
    DATABASE_PORT="5432" \
    DATABASE_USER="placeholder" \
    EMAIL_ADDRESS="placeholder@example.com" \
    EMAIL_SMTP_PORT="25" \
    EMAIL_SMTP_SERVER="localhost" \
    IMGPROXY_BASE_URL="http://localhost" \
    IMGPROXY_KEY="placeholder" \
    IMGPROXY_SALT="placeholder" \
    MAILCHIMP_API_BASE_URL="http://localhost" \
    MAILCHIMP_API_KEY="placeholder" \
    MAILCHIMP_LIST_ID="placeholder" \
    S3_ACCESS_KEY="placeholder" \
    S3_BUCKET_NAME="placeholder" \
    S3_HOST="localhost" \
    S3_PORT="9000" \
    S3_SECRET_KEY="placeholder" \
    TYPESENSE_ADMIN_API_KEY="placeholder" \
    pnpm exec turbo run build --filter=@dariah-eric/knowledge-base

# serve
# -------------------------------------------------------------------------------------------------

FROM base AS app
USER node
WORKDIR /app
# `.next/standalone` is self-contained (includes its own `node_modules`)
COPY --chown=node:node --from=app-build /app/apps/knowledge-base/.next/standalone/ /app/
COPY --chown=node:node --from=app-build /app/apps/knowledge-base/.next/static/ /app/apps/knowledge-base/.next/static/
COPY --chown=node:node --from=app-build /app/apps/knowledge-base/public/ /app/apps/knowledge-base/public/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./apps/knowledge-base/server.js" ]
