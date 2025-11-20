# developer documentation

monorepo managed with `pnpm` workspaces.

## local development setup

### starting and stopping services

local instances of services this application depends on can be started with `docker compose`.

to start all necessary services:

```bash
sh ./scripts/start-all-services.sh
```

to stop all necessary services:

```bash
sh ./scripts/start-all-services.sh
```

to start only some services:

```bash
docker compose \
  --env-file=./.devcontainer/.env \
  --file ./.devcontainer/docker-compose.postgres.yaml \
  --file ./.devcontainer/docker-compose.typesense.yaml \
  --file ./.devcontainer/docker-compose.mailpit.yaml \
  --file ./.devcontainer/docker-compose.drizzle-gateway.yaml \
  up --detach
```

to stop the services and automatically clean up any created volumes:

```bash
docker compose \
  --env-file=./.devcontainer/.env \
  --file ./.devcontainer/docker-compose.postgres.yaml \
  --file ./.devcontainer/docker-compose.typesense.yaml \
  --file ./.devcontainer/docker-compose.mailpit.yaml \
  --file ./.devcontainer/docker-compose.drizzle-gateway.yaml \
  down --volumes
```

| service             | description                                |
| ------------------- | ------------------------------------------ |
| postgres            | database                                   |
| typesense           | search index                               |
| typesense-dashboard | web ui for typesense                       |
| mailpit             | smtp email server with http api and web ui |
| drizzle-gateway     | dashboard for postgres database            |

### configuring services via `.env`

configuration for local development services lives in [`.devcontainer/.env`](`./.devcontainer/.env`)
and is passed to containers via `docker compose`.

| environment variable                  | description | default value |
| ------------------------------------- | ----------- | ------------- |
| DATABASE_HOST                         |             |               |
| DATABASE_NAME                         |             |               |
| DATABASE_PASSWORD                     |             |               |
| DATABASE_PORT                         |             |               |
| DATABASE_USER                         |             |               |
| DRIZZLE_GATEWAY_PORT                  |             |               |
| NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME |             |               |
| NEXT_PUBLIC_TYPESENSE_HOST            |             |               |
| NEXT_PUBLIC_TYPESENSE_PORT            |             |               |
| NEXT_PUBLIC_TYPESENSE_PROTOCOL        |             |               |
| NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY  |             |               |
| TYPESENSE_ADMIN_API_KEY               |             |               |
| TYPESENSE_DASHBOARD_PORT              |             |               |
| EMAIL_ADDRESS                         |             |               |
| EMAIL_SMTP_PORT                       |             |               |
| EMAIL_SMTP_SERVER                     |             |               |
| MAILPIT_API_BASE_URL                  |             |               |
| MAILPIT_API_PORT                      |             |               |

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
dotenv ./.devcontainer/.env -- pnpm run --filter @dariah-eric/db-client db:migrations:create
```
