#!/bin/sh

docker compose \
  --env-file=./.devcontainer/.env \
  -f ./.devcontainer/docker-compose.postgres.yaml \
  -f ./.devcontainer/docker-compose.typesense.yaml \
  -f ./.devcontainer/docker-compose.mailpit.yaml \
  -f ./.devcontainer/docker-compose.drizzle-gateway.yaml \
  up --detach
