# @dariah-eric/maintenance

Recurring **data-cleanup** operations that modify data — distinct from `@dariah-eric/audit` (read-only
checks, never mutates) and `@dariah-eric/migrate` (one-off import transforms). Each script runs as a
dry run by default and only mutates when passed `--apply`.

The detection and mutation logic is the **same shared implementation** the admin dashboard's
Maintenance page uses (in `@dariah-eric/database`), so the CLI and the dashboard can never diverge on
what counts as, say, an "unused" asset.

## scripts

### `data:clean:unused-assets`

Finds assets that are not referenced anywhere — neither by a foreign key to `assets.id` (columns
discovered from the Postgres catalog, so new references are covered automatically) nor embedded by
`key` in any rich-text (`jsonb`) field. Writes a TSV report to `.cache/unused-assets.tsv`.

```bash
pnpm --filter @dariah-eric/maintenance run data:clean:unused-assets            # dry run (report only)
pnpm --filter @dariah-eric/maintenance run data:clean:unused-assets -- --apply # delete rows + objects
pnpm --filter @dariah-eric/maintenance run data:clean:unused-assets -- --apply --backup  # + download to .cache/unused-assets/ first
```

The unused set is recomputed at deletion time, so a reference added since the report protects the
asset. With `--backup`, each object is downloaded before deletion and a failed backup aborts that
asset's removal.

Requires `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_PASSWORD`, `DATABASE_PORT`, `DATABASE_USER` and
`S3_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_HOST`, `S3_PORT`, `S3_PROTOCOL`, `S3_SECRET_KEY` in the
environment.

### `data:clean:empty-content-blocks`

Removes semantically empty `rich_text` content blocks (empty paragraphs, stray hard breaks,
whitespace) — accordion items are left alone. Writes a TSV report to `.cache/empty-content-blocks.tsv`.

```bash
pnpm --filter @dariah-eric/maintenance run data:clean:empty-content-blocks            # dry run
pnpm --filter @dariah-eric/maintenance run data:clean:empty-content-blocks -- --apply # delete
```

The empty set is recomputed at deletion time, so a block edited to have content since the report is
protected. Only the database is touched (needs the `DATABASE_*` env vars).

### `data:clean:unused-social-media`

Finds social-media entries not referenced by any project, organisational unit, service, or report
(referencing columns discovered from the Postgres catalog). Social-media rows are only ever linked by
id, so a foreign-key check is exhaustive. Writes a TSV report to `.cache/unused-social-media.tsv`.

```bash
pnpm --filter @dariah-eric/maintenance run data:clean:unused-social-media            # dry run
pnpm --filter @dariah-eric/maintenance run data:clean:unused-social-media -- --apply # delete
```

The unused set is recomputed at deletion time. Only the database is touched (needs the `DATABASE_*`
env vars).
