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
    pnpm run --filter knowledge-base build
# We don't set `injectWorkspacePackages` directly in `pnpm-workspace.yaml` because it currently
# produces lots of peer dependency warnings.
RUN pnpm deploy --filter knowledge-base --config.inject-workspace-packages=true --prod /out
# p`npm deploy` omits gitignored folders like `.next`.
RUN cp -r /app/apps/knowledge-base/.next/standalone /out/.next/standalone && \
    cp -r /app/apps/knowledge-base/.next/static /out/.next/static

FROM base AS knowledge-base
USER node
WORKDIR /app
COPY --from=knowledge-base-build /out/node_modules/ /app/node_modules/
COPY --from=knowledge-base-build /out/public/ /app/public/
COPY --from=knowledge-base-build /out/next.config.ts /app/next.config.ts
COPY --from=knowledge-base-build /out/.next/standalone/ /app/
COPY --from=knowledge-base-build /out/.next/static/ /app/.next/static/
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "./apps/knowledge-base/server.js" ]
