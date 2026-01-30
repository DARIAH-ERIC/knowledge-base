# developer documentation

monorepo managed with `pnpm` workspaces.

## local development setup

### starting and stopping services

local instances of services this application depends on can be started with `docker compose`.

to start all services:

```bash
pnpm dev:services:up
```

to stop all services:

```bash
pnpm dev:services:down
```

to start only some services, you can provide them as arguments to the script, for example:

```bash
pnpm dev:services:up postgres imgproxy typesense
```

### services

| service         | container           | description                                | ports      |
| --------------- | ------------------- | ------------------------------------------ | ---------- |
| postgres        | postgres            | database                                   | 5432       |
| imgproxy        | imgproxy            | image service                              | 8080       |
| imgproxy        | minio               | includes minio object store                | 9000, 9001 |
| typesense       | typesense           | search index                               | 8108       |
| typesense       | typesense-dashboard | search index web dashboard                 | 5050       |
| mailpit         | mailpit             | smtp email server with http api and web ui | 1025, 8025 |
| pgadmin         | pgadmin             | dashboard for postgres database            | 5555       |
| drizzle-gateway | drizzle-gateway     | dashboard for postgres database            | 4984       |

### configuring services via `.env`

configuration for local development services lives in [`.devcontainer/.env`](`./.devcontainer/.env`)
and is passed to containers via `docker compose`.

| environment variable                           | description | default value |
| ---------------------------------------------- | ----------- | ------------- |
| DATABASE_HOST                                  |             |               |
| DATABASE_NAME                                  |             |               |
| DATABASE_PASSWORD                              |             |               |
| DATABASE_PORT                                  |             |               |
| DATABASE_SSL_CONNECTION                        |             |               |
| DATABASE_USER                                  |             |               |
| DRIZZLE_GATEWAY_PORT                           |             |               |
| PGADMIN_DEFAULT_EMAIL                          |             |               |
| PGADMIN_DEFAULT_PASSWORD                       |             |               |
| PGADMIN_PORT                                   |             |               |
| NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME |             |               |
| NEXT_PUBLIC_TYPESENSE_HOST                     |             |               |
| NEXT_PUBLIC_TYPESENSE_PORT                     |             |               |
| NEXT_PUBLIC_TYPESENSE_PROTOCOL                 |             |               |
| NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY           |             |               |
| TYPESENSE_ADMIN_API_KEY                        |             |               |
| TYPESENSE_DASHBOARD_PORT                       |             |               |
| EMAIL_ADDRESS                                  |             |               |
| EMAIL_SMTP_PORT                                |             |               |
| EMAIL_SMTP_SERVER                              |             |               |
| MAILPIT_API_BASE_URL                           |             |               |
| MAILPIT_API_PORT                               |             |               |
| S3_ACCESS_KEY                                  |             |               |
| S3_BUCKET_NAME                                 |             |               |
| S3_HOST                                        |             |               |
| S3_PORT                                        |             |               |
| S3_PROTOCOL                                    |             |               |
| S3_SECRET_KEY                                  |             |               |
| MINIO_WEB_UI_PORT                              |             |               |
| IMGPROXY_BASE_URL                              |             |               |
| IMGPROXY_KEY                                   |             |               |
| IMGPROXY_PORT                                  |             |               |
| IMGPROXY_SALT                                  |             |               |
| API_ALLOWED_ORIGINS                            |             |               |
| API_BASE_URL                                   |             |               |
| API_LOG_LEVEL                                  |             |               |
| API_PORT                                       |             |               |

### setup and seed

to create the object store bucket, create the typesense collection, push the database schema, and
seed all three services with mock data:

```bash
pnpm dev:services:up
pnpm run dev:services:setup
```

### devcontainer

TODO

## database migrations

the database schema is defined in the `db-client` package in
[packages/db-client/](./packages/db-client/). migrations and scripts also live in the package.

to create a new migration, run the following script from the monorepo root:

```bash
pnpm run db:migrations:create
```

internally, this will invoke scripts from the `db-client` package, and pass in environment config
from `.devcontainer/.env`:

```bash
dotenv ./.devcontainer/.env -- pnpm run --filter @dariah-eric/dariah-knowledge-base-db-client db:migrations:create
```

## production

to connect to the production s3 storage:

```bash
docker run -it \
  -p 8080:8080 \
  -e ACCESS_KEY_ID=${S3_ACCESS_KEY} \
  -e SECRET_ACCESS_KEY=${S3_SECRET_KEY} \
  -e ENDPOINT=s3.acdh-ch-dev.oeaw.ac.at \
  -e SKIP_SSL_VERIFICATION=false \
  cloudlena/s3manager
```
