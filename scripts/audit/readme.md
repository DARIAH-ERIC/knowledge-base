# @dariah-eric/audit

Read-only data-integrity checks against the knowledge-base database. Unlike `@dariah-eric/migrate`
(one-off data transformations) and `@dariah-eric/seed` (local fixtures), these scripts are meant to
run repeatedly — locally, in ci, or on a schedule — against live data. They never modify data; each
script prints findings, writes a tsv report to `.cache/`, and exits non-zero when findings exist.

## scripts

### `data:audit:derived-relations`

Some person-to-organisational-unit relations must be entered twice because one is derivable from
the other (e.g. `national_coordinator` / `national_coordinator_deputy` for a country implies
`is_member_of` the General Assembly governance body). For each rule the script flags persons where:

- `missing_derived` — the source role exists, but the derived relation was never entered
- `missing_source` — the derived relation exists without any role which implies it
- `duration_mismatch` — both exist, but their durations don't line up

Consecutive rows separated by at most one day (e.g. a coordinator term followed by a deputy term)
are merged into one interval per side before comparison, since the other side is often entered as a
single continuous relation.

New rules can be added to the `rules` array in `scripts/audit-derived-relations.ts`.

```bash
pnpm --filter @dariah-eric/audit run data:audit:derived-relations
```

Requires `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_PASSWORD`, `DATABASE_PORT`, `DATABASE_USER` in
the environment.
