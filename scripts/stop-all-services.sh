#!/bin/sh

docker compose \
  --env-file=./.devcontainer/.env \
  --file ./.devcontainer/docker-compose.postgres.yaml \
  --file ./.devcontainer/docker-compose.typesense.yaml \
  --file ./.devcontainer/docker-compose.mailpit.yaml \
  --file ./.devcontainer/docker-compose.drizzle-gateway.yaml \
  --file ./.devcontainer/docker-compose.imgproxy.yaml \
  down --volumes
