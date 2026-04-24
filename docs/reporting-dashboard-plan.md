# Reporting Dashboard — Implementation Plan

## Context

This document captures the full authorization model and the remaining work needed to build the
reporting dashboard. It is written for a coding agent picking up mid-implementation.

---

## What has already been built

### Database schema (`packages/database/lib/schema/`)

**`users.ts`** — two nullable FK columns added:
- `personId uuid → persons.id` — links a user account to a person record
- `organisationalUnitId uuid → organisational_units.id` — links a user account directly to an org
  unit (only meaningful when the unit is a country)
- A `CHECK` constraint prevents both being set on the same row (XOR)

**`reporting.ts`** (new file) — three tables:
- `reporting_campaigns`: `id`, `year` (unique integer), `status` (`open` | `closed`)
- `country_reports`: `id`, `campaign_id → reporting_campaigns`, `country_id → organisational_units`,
  `status` (`draft` | `submitted` | `accepted`), unique on `(campaign_id, country_id)`
- `working_group_reports`: `id`, `campaign_id → reporting_campaigns`,
  `working_group_id → organisational_units`, `status` (`draft` | `submitted` | `accepted`),
  unique on `(campaign_id, working_group_id)`

Note: `country_id` and `working_group_id` are both FKs to `organisational_units`. There is no
DB-level type constraint — enforcement that these point to the correct unit type is at the
application layer.

Relations for all new tables are defined in `packages/database/lib/relations.ts`.

### Authorization layer

**`apps/knowledge-base/lib/auth/session.ts`**
- `assertAuthenticated()` — existing, checks session/email/2FA
- `assertAdmin()` — new, calls `assertAuthenticated()` then redirects to `/dashboard` if
  `user.role !== "admin"`

**`apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/administrator/layout.tsx`** (new)
- Route-level layout that calls `assertAdmin()`, protecting all ~35 admin pages in one place

**All server actions under `dashboard/administrator/`** — updated from `assertAuthenticated()` to
`assertAdmin()`

**`apps/knowledge-base/lib/auth/permissions.ts`** (new) — the core permission module:

```ts
// Entry points
can(user: User, action: Action, resource: Resource): Promise<boolean>
assertCan(user: User, action: Action, resource: Resource): Promise<void>  // redirects to /dashboard on denial

type Action = "read" | "create" | "update" | "delete" | "confirm"

type Resource =
  | { type: "organisational_unit"; id: string }
  | { type: "country_report"; id: string }
  | { type: "working_group_report"; id: string }
```

### Auth package (`packages/auth/lib/index.ts`)

`User` interface now includes `personId: string | null` and `organisationalUnitId: string | null`
alongside the existing fields. All four DB select sites in the auth service were updated. Both
packages were rebuilt.

### User management UI

The admin user create/edit forms now have an "Actor link" section with a role selector
(`none` | `person` | `country`) and a searchable picker for the chosen type. The pickers reuse the
existing `ContributionOptionPicker` component. A `countries` resource was added to the
`/api/contributions/options` route and `getCountryOptions()` was added to
`apps/knowledge-base/lib/data/contributions.ts`.

---

## Permission matrix

The `can()` function in `permissions.ts` implements this logic:

| User has… | Role type on org unit | `update` org unit metadata | `update` report | `confirm` report |
|---|---|---|---|---|
| `personId` | `is_chair_of`, `is_vice_chair_of`, `is_director_of` | ✓ (working groups) | ✓ | ✓ |
| `personId` | `is_member_of` | — | ✓ | — |
| `personId` | `national_coordinator`, `national_coordinator_deputy` | — | ✓ (country reports) | ✓ |
| `personId` | `national_representative`, `national_representative_deputy` | — | ✓ (country reports) | — |
| `organisationalUnitId` | (country, direct link) | — | ✓ (that country's report only) | — |
| `role = "admin"` | — | ✓ | ✓ | ✓ |

"Active" means `NOW()` is within the `duration` tstzrange on the `persons_to_organisational_units`
row.

`assertCan` is called in server actions **after** `assertAuthenticated()`. Admin users short-circuit
immediately — `can()` returns `true` for any action if `user.role === "admin"`.

### Usage pattern in a server action

```ts
"use server";
// ...
import { assertAuthenticated } from "@/lib/auth/session";
import { assertCan } from "@/lib/auth/permissions";

export const updateWorkingGroupReportAction = createServerAction(
  async function updateWorkingGroupReportAction(state, formData) {
    // ...rate limit...
    const { user } = await assertAuthenticated();
    await assertCan(user, "update", { type: "working_group_report", id: reportId });
    // ...validate + DB update...
  }
);
```

---

## What still needs to be built — Phase 4

### Overview

There are two audiences for the reporting dashboard:

- **Admins** — manage reporting campaigns; view and edit all reports across all working groups and
  countries. Pages live under `/dashboard/administrator/`. Already protected by `assertAdmin()` via
  the administrator layout.
- **Regular users** — edit and/or confirm only the specific reports they are responsible for.
  Pages live under a new `/dashboard/reporting/` section (not under `/administrator/`).

### 4A — Admin reporting management

These stub pages already exist but have no content:
- `dashboard/administrator/working-group-reports/page.tsx`
- `dashboard/administrator/country-reports/page.tsx`

#### Reporting campaigns (new)

Add pages for admins to manage campaigns:
- `dashboard/administrator/reporting-campaigns/page.tsx` — list all campaigns
- `dashboard/administrator/reporting-campaigns/create/page.tsx`
- `dashboard/administrator/reporting-campaigns/[id]/edit/page.tsx`

Server actions in `_lib/`:
- `create-reporting-campaign.action.ts` + schema
- `update-reporting-campaign.action.ts` + schema
- `delete-reporting-campaign.action.ts`

All call `assertAdmin()`. No `assertCan` needed here.

#### Admin report list pages

Flesh out the two existing stubs. Each page should:
1. List all campaigns (or filter by selected campaign)
2. For each campaign, show all working groups / countries and the status of their report
3. Provide a link to create or edit each report

Add create and edit pages:
- `dashboard/administrator/working-group-reports/create/page.tsx`
- `dashboard/administrator/working-group-reports/[id]/edit/page.tsx`
- `dashboard/administrator/country-reports/create/page.tsx`
- `dashboard/administrator/country-reports/[id]/edit/page.tsx`

Server actions (all call `assertAdmin()`):
- `create-working-group-report.action.ts` + schema
- `update-working-group-report.action.ts` + schema
- `delete-working-group-report.action.ts`
- `create-country-report.action.ts` + schema
- `update-country-report.action.ts` + schema
- `delete-country-report.action.ts`

The create actions should enforce the uniqueness constraint (one report per campaign per working
group / country) at the application level and return a meaningful error if violated.

### 4B — User-facing reporting dashboard

Regular users land on `/dashboard` and should see only what they are responsible for. Add a new
section at `/dashboard/reporting/`.

#### Route structure

```
app/(app)/[locale]/(dashboard)/dashboard/reporting/
  layout.tsx                         ← calls assertAuthenticated() only (not assertAdmin)
  page.tsx                           ← overview: links to WG reports and country reports the user can access
  working-group-reports/
    [id]/
      edit/
        page.tsx                     ← edit form for one WG report
  country-reports/
    [id]/
      edit/
        page.tsx                     ← edit form for one country report
```

#### `layout.tsx`

Only calls `assertAuthenticated()` — regular users are allowed here. Admin users are also allowed
(they may want to use the same UI).

#### `page.tsx` — reporting overview

Server component. Calls `assertAuthenticated()` to get the user, then:

1. If `user.role === "admin"`, redirect to `/dashboard/administrator/working-group-reports` (or show
   a combined view).
2. If `user.personId` is set, query the person's active `personsToOrganisationalUnits` relations to
   find which working groups and countries they are responsible for. Cross-reference with
   `working_group_reports` and `country_reports` for the current open campaign to get report IDs
   and statuses.
3. If `user.organisationalUnitId` is set (country), query the country's report for the open
   campaign.
4. Render a list of report cards with status badges and links to the edit page.

Helper query to add to `apps/knowledge-base/lib/data/reporting.ts` (new file):

```ts
getUserReportingScope(userId: string): Promise<{
  workingGroupReports: Array<{ reportId: string; workingGroupName: string; status: string; canConfirm: boolean }>;
  countryReports: Array<{ reportId: string; countryName: string; status: string; canConfirm: boolean }>;
}>
```

This function should find the current open campaign and then resolve what the user can see/edit.

#### Edit pages

Each edit page:
1. Fetches the report by ID (including its campaign and org unit name)
2. Calls `assertAuthenticated()` to get the user
3. Derives `canConfirm` by calling `can(user, "confirm", { type: ..., id })` — used to conditionally
   render a "Confirm / Submit" button
4. Renders the report edit form

#### Server actions (in `_lib/` under each report section)

**`update-working-group-report.action.ts`**
```ts
const { user } = await assertAuthenticated();
await assertCan(user, "update", { type: "working_group_report", id });
// validate + update
```

**`confirm-working-group-report.action.ts`** — sets `status` to `"accepted"`
```ts
const { user } = await assertAuthenticated();
await assertCan(user, "confirm", { type: "working_group_report", id });
await db.update(schema.workingGroupReports).set({ status: "accepted" }).where(...)
```

**`submit-working-group-report.action.ts`** — sets `status` to `"submitted"` (available to editors,
not just chairs)
```ts
const { user } = await assertAuthenticated();
await assertCan(user, "update", { type: "working_group_report", id });
await db.update(schema.workingGroupReports).set({ status: "submitted" }).where(...)
```

Repeat the same pattern for `country-reports`.

### 4C — Report content

The current `working_group_reports` and `country_reports` tables only have `status`. Actual report
content (text fields, uploaded files, etc.) has not been designed yet. When content fields are
added, they will be extra columns or a related JSONB column on these tables — the permission
enforcement is already in place and will not change. The `update` actions will simply set more
fields.

---

## Conventions to follow

- Server components fetch data directly from `db` (the Drizzle client at
  `@dariah-eric/database/client`)
- Server actions live in `_lib/` alongside their schema files, following the existing pattern in
  e.g. `dashboard/administrator/working-groups/_lib/`
- Client form components live in `_components/`, follow the `*-form.tsx` / `*-create-form.tsx` /
  `*-edit-form.tsx` naming
- All server actions call rate limiting first (`globalPostRequestRateLimit`), then auth, then
  validate with valibot
- Schema validation files use `*ActionInputSchema` naming with `v.pipe(v.object(...), ...)` for
  cross-field checks
- Redirect after successful mutation uses `redirect({ href: "...", locale })`
- Revalidate using `revalidatePath("/[locale]/dashboard/...", "layout")`
- The `createServerAction` wrapper from `@/lib/server/create-server-action` is used for all actions
- `useExtracted` / `getExtracted` for i18n in client / server components respectively

---

## Key file locations

| Purpose | Path |
|---|---|
| Permission logic | `apps/knowledge-base/lib/auth/permissions.ts` |
| `assertAdmin` / `assertAuthenticated` | `apps/knowledge-base/lib/auth/session.ts` |
| Reporting schema | `packages/database/lib/schema/reporting.ts` |
| Schema index | `packages/database/lib/schema.ts` |
| DB relations | `packages/database/lib/relations.ts` |
| Auth package User type + select sites | `packages/auth/lib/index.ts` |
| Contributions data helpers (incl. `getCountryOptions`) | `apps/knowledge-base/lib/data/contributions.ts` |
| Contributions options API route | `apps/knowledge-base/app/api/contributions/options/route.ts` |
| Administrator layout (assertAdmin gate) | `apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/administrator/layout.tsx` |
| Example complex edit page to follow | `apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/[slug]/edit/page.tsx` |
| Example server action to follow | `apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group.action.ts` |
