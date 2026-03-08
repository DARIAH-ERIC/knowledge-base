# syntax=docker/dockerfile:1

# base
# -------------------------------------------------------------------------------------------------

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
RUN corepack enable
RUN pnpm add --global turbo

# source
# -------------------------------------------------------------------------------------------------

FROM base AS source
WORKDIR /app
COPY . .

# =================================================================================================
# api
# =================================================================================================

# prune
# -------------------------------------------------------------------------------------------------

FROM source AS api-pruner
RUN turbo prune @dariah-eric/api --docker

# install
# -------------------------------------------------------------------------------------------------

FROM base AS api-installer
WORKDIR /app
COPY --from=api-pruner /app/out/json/ .
COPY --from=api-pruner /app/patches/ ./patches/
COPY --from=api-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# build
# -------------------------------------------------------------------------------------------------

FROM api-installer AS api-builder
COPY --from=api-pruner /app/out/full/ .
RUN turbo run build --filter=@dariah-eric/api
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter @dariah-eric/api --config.inject-workspace-packages=true --prod /out

# serve
# -------------------------------------------------------------------------------------------------

FROM base AS api
USER node
WORKDIR /app
COPY --from=api-builder /out/node_modules/ /app/node_modules/
COPY --from=api-builder /out/public/ /app/public/
COPY --from=api-builder /out/dist/ /app/dist/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./dist/index.mjs" ]

# =================================================================================================
# app
# =================================================================================================

# prune
# -------------------------------------------------------------------------------------------------

FROM source AS knowledge-base-pruner
RUN turbo prune @dariah-eric/knowledge-base --docker

# install
# -------------------------------------------------------------------------------------------------

FROM base AS knowledge-base-installer
WORKDIR /app
COPY --from=knowledge-base-pruner /app/out/json/ .
COPY --from=knowledge-base-pruner /app/patches/ ./patches/
COPY --from=knowledge-base-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# build
# -------------------------------------------------------------------------------------------------

FROM knowledge-base-installer AS knowledge-base-builder
ARG BUILD_MODE=standalone
ARG NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_APP_BOTS
ARG NEXT_PUBLIC_APP_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_APP_IMPRINT_CUSTOM_CONFIG
ARG NEXT_PUBLIC_APP_IMPRINT_SERVICE_BASE_URL
ARG NEXT_PUBLIC_APP_MATOMO_BASE_URL
ARG NEXT_PUBLIC_APP_MATOMO_ID
ARG NEXT_PUBLIC_APP_SENTRY_DSN
ARG NEXT_PUBLIC_APP_SENTRY_ORG
ARG NEXT_PUBLIC_APP_SENTRY_PII
ARG NEXT_PUBLIC_APP_SENTRY_PROJECT
ARG NEXT_PUBLIC_APP_SERVICE_ID
ARG NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME
ARG NEXT_PUBLIC_TYPESENSE_HOST
ARG NEXT_PUBLIC_TYPESENSE_PORT
ARG NEXT_PUBLIC_TYPESENSE_PROTOCOL
COPY --from=knowledge-base-pruner /app/out/full/ .
RUN --mount=type=secret,id=AUTH_ENCRYPTION_KEY,env=AUTH_ENCRYPTION_KEY \
    --mount=type=secret,id=AUTH_SIGN_UP,env=AUTH_SIGN_UP \
    --mount=type=secret,id=DATABASE_HOST,env=DATABASE_HOST \
    --mount=type=secret,id=DATABASE_NAME,env=DATABASE_NAME \
    --mount=type=secret,id=DATABASE_PASSWORD,env=DATABASE_PASSWORD \
    --mount=type=secret,id=DATABASE_PORT,env=DATABASE_PORT \
    --mount=type=secret,id=DATABASE_USER,env=DATABASE_USER \
    --mount=type=secret,id=EMAIL_ADDRESS,env=EMAIL_ADDRESS \
    --mount=type=secret,id=EMAIL_SMTP_PORT,env=EMAIL_SMTP_PORT \
    --mount=type=secret,id=EMAIL_SMTP_SERVER,env=EMAIL_SMTP_SERVER \
    --mount=type=secret,id=IMGPROXY_BASE_URL,env=IMGPROXY_BASE_URL \
    --mount=type=secret,id=IMGPROXY_KEY,env=IMGPROXY_KEY \
    --mount=type=secret,id=IMGPROXY_PORT,env=IMGPROXY_PORT \
    --mount=type=secret,id=IMGPROXY_SALT,env=IMGPROXY_SALT \
    --mount=type=secret,id=MAILCHIMP_API_BASE_URL,env=MAILCHIMP_API_BASE_URL \
    --mount=type=secret,id=MAILCHIMP_API_KEY,env=MAILCHIMP_API_KEY \
    --mount=type=secret,id=MAILCHIMP_LIST_ID,env=MAILCHIMP_LIST_ID \
    --mount=type=secret,id=S3_ACCESS_KEY,env=S3_ACCESS_KEY \
    --mount=type=secret,id=S3_BUCKET_NAME,env=S3_BUCKET_NAME \
    --mount=type=secret,id=S3_HOST,env=S3_HOST \
    --mount=type=secret,id=S3_PORT,env=S3_PORT \
    --mount=type=secret,id=S3_PROTOCOL,env=S3_PROTOCOL \
    --mount=type=secret,id=S3_SECRET_KEY,env=S3_SECRET_KEY \
    --mount=type=secret,id=TYPESENSE_ADMIN_API_KEY,env=TYPESENSE_ADMIN_API_KEY \
    turbo run build --filter=@dariah-eric/knowledge-base

# serve
# -------------------------------------------------------------------------------------------------

FROM base AS knowledge-base
USER node
WORKDIR /app
# `.next/standalone` is self-contained (includes its own `node_modules`)
COPY --from=knowledge-base-builder /app/apps/knowledge-base/.next/standalone/ /app/
COPY --from=knowledge-base-builder /app/apps/knowledge-base/.next/static/ /app/apps/knowledge-base/.next/static/
COPY --from=knowledge-base-builder /app/apps/knowledge-base/public/ /app/apps/knowledge-base/public/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./apps/knowledge-base/server.js" ]
