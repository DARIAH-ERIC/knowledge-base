# @dariah-eric/maintenance

Recurring **data-cleanup** operations that modify data — distinct from `@dariah-eric/audit` (read-only
checks, never mutates) and `@dariah-eric/migrate` (one-off import transforms). Each script runs as a
dry run by default and only mutates when passed `--apply`.

For the `data:clean:*` scripts the detection and mutation logic is the **same shared implementation**
the admin dashboard's Maintenance page uses (in `@dariah-eric/database`), so the CLI and the dashboard
can never diverge on what counts as, say, an "unused" asset. `data:backfill:sshoc-actor-ids` has no
dashboard counterpart — it exists precisely because the work needs a reviewed report.

## scripts

### `data:backfill:sshoc-actor-ids`

Proposes `organisational_units.sshoc_marketplace_actor_id` values for institutions by matching SSHOC
marketplace actors against local units. Writes a report to `.cache/sshoc-actor-ids.tsv`.

Without an actor id a unit is invisible to the SSHOC service ingest, so an upstream `reviewer` or
`provider` contributor produces no service relation and is merely listed in that job's
`unmappedActors` report. This script is the other half of that loop.

Only actors the ingest can actually use are considered: contributors in the `reviewer` or `provider`
role on a non-software "DARIAH Resource" tool-or-service, using the same fetch and the same filters
as `@dariah-eric/sshoc-services`. Actors that already resolve to a published unit are skipped.

```bash
pnpm --filter @dariah-eric/maintenance run data:backfill:sshoc-actor-ids            # dry run (report only)
pnpm --filter @dariah-eric/maintenance run data:backfill:sshoc-actor-ids -- --scope=all
pnpm --filter @dariah-eric/maintenance run data:backfill:sshoc-actor-ids -- --apply # write unambiguous matches
pnpm --filter @dariah-eric/maintenance run data:backfill:sshoc-actor-ids -- --apply --from-file=.cache/sshoc-actor-ids.tsv
```

Each proposal carries a confidence:

| confidence | basis                                | auto-applied |
| ---------- | ------------------------------------ | ------------ |
| `ror`      | same ROR on both sides               | yes          |
| `name`     | identical normalised name            | yes          |
| `acronym`  | actor name equals a unit acronym     | no           |
| `fuzzy`    | token overlap ≥ 0.5, best unit shown | no           |

`--apply` writes only `ror` and `name`, and only where a unit is proposed once — an ambiguous key is
reported rather than guessed at. The rest are for a human: edit `unit_document_id` in the report to
correct a pairing, clear it to reject one, then re-run with `--apply --from-file=…`. Only `actor_id`
and `unit_document_id` are read back, and rows whose actor or unit is no longer a candidate are
skipped, so a stale report cannot overwrite work done since.

`--scope` selects the candidate units: `partner` (default) is institutions with an
`is_partner_institution_of` relation, `all` is every institution. Widening it roughly doubles the
matches, because plenty of upstream providers are recorded locally as `is_located_in` only.

The id is written to **every version** of the unit, draft and published alike. The admin form writes
the draft only, which is right for editorial fields; this is an external identifier, and leaving it
on the draft would keep the ingest (which reads published versions) ignoring the actor until someone
publishes each unit. Existing ids are never overwritten. Needs the `DATABASE_*` env vars and
`SSHOC_MARKETPLACE_API_BASE_URL`.

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
