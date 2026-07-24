# @dariah-eric/maintenance

Recurring **data-cleanup** operations that modify data — distinct from `@dariah-eric/audit` (read-only
checks, never mutates) and `@dariah-eric/migrate` (one-off import transforms). Each script runs as a
dry run by default and only mutates when passed `--apply`.

For the `data:clean:*` scripts the detection and mutation logic is the **same shared implementation**
the admin dashboard's Maintenance page uses (in `@dariah-eric/database`), so the CLI and the dashboard
can never diverge on what counts as, say, an "unused" asset. The `data:backfill:*` scripts have no
dashboard counterpart — they exist precisely because the work needs a reviewed report.

## scripts

The two `data:backfill:*` scripts share a shape — propose a value for one column by matching local
records against an external register, write every proposal to a TSV, apply only the unambiguous ones
— and share the helpers for it in `lib/`. Both write to **every version** of a unit, draft and
published alike: these are external identifiers with no editorial content, and leaving one on a draft
means the consumers (the SSHOC ingest reads published versions) keep ignoring it until somebody
publishes each unit by hand. Neither ever overwrites an existing value.

### `data:backfill:institution-rors`

Proposes `organisational_units.ror` for institutions from
[ROR's affiliation matcher](https://ror.readme.io/docs/match-organization-names-to-ror-ids). Writes a
report to `.cache/institution-rors.tsv`.

```bash
pnpm --filter @dariah-eric/maintenance run data:backfill:institution-rors             # dry run (report only)
pnpm --filter @dariah-eric/maintenance run data:backfill:institution-rors -- --limit=50
pnpm --filter @dariah-eric/maintenance run data:backfill:institution-rors -- --apply  # write exact matches
pnpm --filter @dariah-eric/maintenance run data:backfill:institution-rors -- --apply --from-file=.cache/institution-rors.tsv
```

Institutions only, on purpose. National consortia, countries, working groups and governance bodies
are consortia, projects and administrative bodies rather than research organisations, so ROR mostly
does not list them — of 25 national consortia exactly one resolves, which is quicker to enter by hand.

| confidence         | basis                                                               | auto-applied |
| ------------------ | ------------------------------------------------------------------- | ------------ |
| `exact`            | a ROR name or alias identical to ours, in the country we have it in | yes          |
| `country_mismatch` | the name matches, but ROR places it in another country              | no           |
| `loose`            | ROR chose a record, but none of its names match ours                | no           |
| `none`             | ROR declined to choose                                              | —            |

Two independent gates, because they catch different failures and neither covers both.

The **name** gate catches a _parent_ organisation standing in for a specific unit. Measured against
the 47 institutions that already had a ROR, the matcher alone chose correctly 34 times, wrongly twice
and declined 11 — and both errors were of this kind (`NOVA University of Lisbon` → University of
Lisbon). They come back tagged exactly like correct answers (`SINGLE SEARCH`, score 1) and sit in the
same country as the right answer, so only the name separates them; requiring an exact name accepted
31 with no errors.

The **country** gate catches the opposite case, a generic local name colliding with a real alias
somewhere else. Our `National and University Library` (Croatia) matches an English alias of
Strasbourg's BNU exactly, and ROR offers no competing exact match to signal the ambiguity — but the
countries disagree, so it lands in `country_mismatch` instead of being written. On a 60-institution
sample it demoted that row and nothing else.

The unit's country comes from its `is_located_in` relation, which ~15% of institutions lack; an
unknown country on either side is not treated as a mismatch, so the name gate then decides alone.
Country names are canonicalised before comparison (ROR says Czechia, Türkiye and The Netherlands
where we say Czech Republic, Turkey and Netherlands) — and a pair the alias map fails to reconcile
reads as a mismatch, which means an omission there costs a reviewer a glance rather than writing a
wrong value.

The report carries `unit_country` next to `ror_country` and `ror_city` so a reviewer can settle a
generic name at a glance.

A ROR already used by another unit is never proposed, so the backfill cannot merge two records by
giving them the same identifier.

Requests are sequential with `--delay-ms` (default 250) between them, keeping well inside ROR's
guideline of ~2000 requests per 5 minutes; a 429 or 5xx is retried with exponential backoff. A full
run over ~800 institutions takes roughly five minutes. Needs the `DATABASE_*` env vars and optionally
`ROR_API_BASE_URL` (defaults to `https://api.ror.org`).

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

Needs the `DATABASE_*` env vars and `SSHOC_MARKETPLACE_API_BASE_URL`.

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

### `data:normalise:identifier-urls`

Rewrites `persons.orcid` and `organisational_units.ror` to canonical urls (`https://orcid.org/…`,
`https://ror.org/…`). Both fields accept freetext, so an editor may enter a bare id or a url — the
details pages render either form, and this makes the stored value uniform. Writes a TSV report to
`.cache/identifier-urls.tsv`.

```bash
pnpm --filter @dariah-eric/maintenance run data:normalise:identifier-urls            # dry run (report only)
pnpm --filter @dariah-eric/maintenance run data:normalise:identifier-urls -- --apply # write canonical urls
```

A value that holds no recognisable ORCID or ROR id is left untouched and listed in the report with
`action=unrecognised` for a human to look at — the script never guesses. Normalisation is idempotent
and runs per version row, so a document's draft and published copies are both corrected. Only the
database is touched (needs the `DATABASE_*` env vars).
