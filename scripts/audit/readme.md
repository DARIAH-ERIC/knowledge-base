# @dariah-eric/audit

Read-only data-integrity checks against the knowledge-base database. Unlike `@dariah-eric/migrate`
(one-off data transformations) and `@dariah-eric/seed` (local fixtures), these scripts are meant to
run repeatedly — locally, in ci, or on a schedule — against live data. They never modify data; each
script prints findings, writes a tsv report to `.cache/`, and exits non-zero when findings exist.

## scripts

### `data:audit:paired-relations`

Some pairs of person-to-organisational-unit relations must always be entered together because they
record the same fact from two angles (e.g. `national_representative` /
`national_representative_deputy` for a country ⇔ `is_member_of` the General Assembly governance
body). Neither side is derived from the other — a user may enter either one first — so each rule is
checked in both directions. For each rule the script flags persons where:

- `missing_counterpart` — one side of the pair exists, but its counterpart was never entered
- `duration_mismatch` — both sides exist, but their durations don't line up

Consecutive rows separated by at most one day (e.g. a representative term followed by a deputy term)
are merged into one interval per side before comparison, since the other side is often entered as a
single continuous relation.

New rules can be added to the `pairedRelationRules` array in `@dariah-eric/database/integrity-service`.

```bash
pnpm --filter @dariah-eric/audit run data:audit:paired-relations
```

Requires `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_PASSWORD`, `DATABASE_PORT`, `DATABASE_USER` in
the environment.
