#!/bin/sh

set -eu

pnpm image-service:buckets:create
pnpm db:push
pnpm search-index:collections:create

pnpm dev:services:seed
