#!/bin/bash

docker compose \
  --env-file=./apps/knowledge-base/.env.local \
  -f ./.devcontainer/docker-compose.postgres.yaml \
  -f ./.devcontainer/docker-compose.typesense.yaml \
  -f ./.devcontainer/docker-compose.mailpit.yaml \
  -f ./.devcontainer/docker-compose.drizzle-gateway.yaml \
  down --volumes
