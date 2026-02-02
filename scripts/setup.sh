#!/bin/sh

set -eu

pnpm storage:buckets:create
pnpm db:push && pnpm run db:migrations:apply
pnpm search:collections:create

pnpm dev:services:seed
