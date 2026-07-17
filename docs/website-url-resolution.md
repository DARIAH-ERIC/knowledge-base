# Website URL resolution

How knowledge-base (the headless CMS) resolves entities to pathnames on the public
DARIAH website (`github.com/DARIAH-ERIC/dariah-website`), and the plan to single-source
that mapping.

## Problem

The `entity type → website pathname` mapping is duplicated across three places that can
(and already do) disagree:

1. **Search indexer** — `packages/search-website/lib/index.ts` writes a full `link` string
   into every Typesense document (and even duplicates it internally: the news link is built
   in both `getWebsiteDocumentForEntity` and `createWebsiteEntityDocuments`).
2. **API responses** — `GET /api/navigation` (`apps/api/src/routes/navigation/service.ts`)
   and related-entities (`apps/api/src/lib/schemas.ts` `RelatedEntitiesSchema`) return bare
   `{ type, slug }`, forcing the website to reproduce every prefix/rename itself.
3. **The website** — the typed route folders under `app/(default)/…` are the real,
   authoritative URL structure. (Its main nav config, `lib/navigation/navigation.ts`, is
   currently a static hardcoded list — the `/api/navigation` endpoint is not wired in yet.)

The URL structure is **not** a flat `type → segment` map: it has section nesting
(`/about/…`, `/network/…`, `/get-involved/…`), renamed segments (`spotlights`,
`members-and-partners`), a listing-only type, and cross-entity resolution (institutions and
national consortia resolve to their _country's_ page).

## Authoritative route table

Derived from the website's `app/(default)/…` folders. This is the source of truth the
resolver encodes.

| Website type        | Pathname template                             | Source folder                                 |
| ------------------- | --------------------------------------------- | --------------------------------------------- |
| news-item           | `/news/{slug}`                                | `news/[slug]`                                 |
| event               | `/events/{slug}`                              | `events/[slug]`                               |
| project             | `/projects/{slug}`                            | `projects/[slug]`                             |
| spotlight-article   | `/spotlights/{slug}`                          | `spotlights/[slug]`                           |
| impact-case-study   | `/about/impact-case-studies/{slug}`           | `about/impact-case-studies/[slug]`            |
| funding-call        | `/get-involved/funding-calls/{slug}`          | `get-involved/funding-calls/[slug]`           |
| opportunity         | `/get-involved/opportunities/{slug}`          | `get-involved/opportunities/[slug]`           |
| working-group       | `/network/working-groups/{slug}`              | `network/working-groups/[slug]`               |
| country             | `/network/members-and-partners/{slug}`        | `network/members-and-partners/[slug]`         |
| national-consortium | `/network/members-and-partners/{countrySlug}` | (country page)                                |
| institution         | `/network/members-and-partners/{countrySlug}` | (country page)                                |
| document-or-policy  | `/about/documents`                            | `about/documents` (listing)                   |
| person              | `/persons/{slug}`                             | `persons/[slug]` (to be added on the website) |
| **page**            | **author-defined path (see open decision)**   | one page catch-all (see below)                |

## Live drift found (bugs)

Comparing the search indexer's current `link` output against the authoritative table:

| Type         | Search index writes     | Website serves                       | Effect          |
| ------------ | ----------------------- | ------------------------------------ | --------------- |
| funding-call | `/funding-calls/{slug}` | `/get-involved/funding-calls/{slug}` | search hit 404s |
| opportunity  | `/opportunities/{slug}` | `/get-involved/opportunities/{slug}` | search hit 404s |
| person       | `/persons/{slug}`       | _no route_                           | search hit 404s |
| page         | `/{slug}`               | _no route_                           | search hit 404s |

The website's search result item renders the stored `link` directly, so these are
user-facing 404s today.

## Decision

- Keep the website's **typed folders** (catch-all `[[...slug]]` + resolver was rejected as
  too much website refactoring).
- Extract one pure, locale-less, **zero-dependency** resolver `getEntityHref(params)` into
  `packages/website-routes` (`@dariah-eric/website-routes`) and route the search indexer,
  API navigation, and related-entities through it.
- The website keeps its **own copy** of the resolver for now (duplication accepted as a
  first step); later the package is published and the copy deleted. The package is kept
  dependency-free specifically so that lift is a one-import change.

Two type vocabularies exist: DB entity types (`news`, `impact_case_studies`,
`organisational_units` + subtype) vs. website types (`news-item`, `country`, …). The
resolver speaks the website vocabulary; each consumer maps its DB rows into it. Params are a
discriminated union (`{ slug }` | no-slug | `{ countrySlug }`).

## Interim checkpoint (shipped ahead of the migration)

Fixes the search-index ingest now, without the `pages.path` migration:

- `packages/search-website/lib/index.ts` routes **all 27** `link` sites through `getEntityHref`
  (both the per-entity and bulk builders), replacing the hardcoded strings.
- **Bug fixes:** funding-call and opportunity now emit `/get-involved/…` (were 404ing).
- **person:** emits the canonical `/persons/{slug}` — needs the `persons/[slug]` website route to
  ship before those links resolve.
- **page:** uses `resolveInterimPagePath` (`packages/website-routes/lib/interim-page-paths.ts`), a
  hardcoded slug→pathname map. **Authoritative source: issue #703** ("Map page slugs to website
  paths") — the hand-curated mapping (~18 pages, incl. section landings, resource pages, and the
  footer legal pages, whose slugs deliberately differ from the path leaf). Pages not in the map
  return `null` and are **skipped** — so no 404 links, and previously-indexed unmapped pages are
  removed on the next sync. `partnerships-and-collaborations` is excluded (unresolved target).
- The interim map is a temporary file to delete once `pages.path` exists; issue #703 is also the
  backfill source for that column.

Not run here (no DB harness in this environment): a reindex against a seeded/staging DB to eyeball
the document diff before deploy.

## Plan

- **Phase 0 — resolver package.** `packages/website-routes` with `getEntityHref`,
  `websiteEntityTypes`, `routableEntityTypes`, golden + exhaustiveness tests. No behavior
  change; nothing wired yet. `page`/`person` are intentionally **not** in the routable set
  (compile error to resolve them) pending the decision below.
- **Phase 1 — search indexer.** Replace every inline `link` in
  `packages/search-website/lib/index.ts` with `getEntityHref`. A characterization test
  snapshots `{ id → link }` before/after; the diff is exactly the four drift rows above.
  funding-call/opportunity are corrected; person/page are the open decision.
- **Phase 2 — API navigation** emits `pathname` (additive field) via the resolver.
- **Phase 3 — related-entities** emits `pathname` (additive) via the resolver.
- **Phase 4 (optional)** — richtext entity-reference nodes resolve via the same resolver.
- **Phase 5 — website** copies the resolver in, consumes API `pathname` where present,
  commits the identical golden fixture, asserts against it.
- **Phase 6 (later)** — publish `@dariah-eric/website-routes`, delete the website's copy.

A CMS-side test asserts `websiteEntityTypes` stays in sync with the DB entity-type +
org-unit-subtype enums, so a new content type cannot silently lack a route.

## Listing / overview pages

Besides entity detail pages, each collection has an overview page (`/news`, `/projects`,
`/get-involved/funding-calls`, …). These are the **same drift class** as detail pages — e.g. the
funding-call listing is at `/get-involved/funding-calls`, not `/funding-calls` — and are currently
hardcoded as raw `href` strings in the seed navigation. `getEntityListHref(type)` in
`packages/website-routes` single-sources them. A type's detail page lives under its listing page
(asserted by a test).

| Type               | Listing path                    |
| ------------------ | ------------------------------- |
| news-item          | `/news`                         |
| event              | `/events`                       |
| project            | `/projects`                     |
| spotlight-article  | `/spotlights`                   |
| impact-case-study  | `/about/impact-case-studies`    |
| funding-call       | `/get-involved/funding-calls`   |
| opportunity        | `/get-involved/opportunities`   |
| working-group      | `/network/working-groups`       |
| country            | `/network/members-and-partners` |
| document-or-policy | `/about/documents`              |

`page`, `person`, `institution`, `national-consortium` have no listing of their own.

### How a listing page renders (two endpoints)

A listing route is two things at one URL: the **collection data** (the type's own endpoint, e.g.
`GET /api/events`) plus a `page` entity supplying the **title + richtext intro**. The typed listing
folder fetches both. The intro page is the `page` whose path equals the listing route — in #703,
`projects-list` → `/projects`, `working-groups-list` → `/network/working-groups`,
`impact-case-studies` → `/about/impact-case-studies`, `members-and-partners`, `spotlights`. (Some
listings — `/news`, `/events`, funding-calls, opportunities — have no intro page yet.) So
`getEntityListHref(type)` is the shared anchor: the nav-link target **and** the key the folder uses
to fetch its intro (`GET /api/pages/by-path?path=…` once `pages.path` exists).

Note: the website's nav resolver (`lib/navigation/convert.ts`) currently only maps `events` and
`news` entity refs and calls `unreachable()` for any other type — it works today only because the
seed nav uses raw `href` for everything. Phase 5 replaces its `getHref`/list handling with the
shared `getEntityHref` / `getEntityListHref`.

## Fixed site pages (not entities)

Per issue #703, the footer legal pages (`legal-notice`, `privacy-notice`, `accessibility-declaration`)
and the resource landing pages (`resource-catalogue`, `dariah-campus`, `transformation-a-dariah-journal`,
`ssh-open-marketplace`) are **CMS `page` entities** — so they ride the page-path mechanism (interim
map now → `pages.path` later) and resolve via `getEntityHref({ type: "page", path })`. (The legal
pages currently render stub not-found placeholders on the beta site, and the seed secondary nav
still points them at `/` placeholders — both to be fixed.)

Genuinely non-entity routes remain out of the resolver's scope: `/` (home), `/contact`, `/search`,
the external annual-events link, and the collection listing routes (`/news`, `/events`,
`/about/documents`, `/get-involved/funding-calls`, `/get-involved/opportunities`) — the last of
which are handled by `getEntityListHref`.

## Decisions

- **person** — DECIDED: add a `persons/[slug]` route to the website; resolver maps
  `person → /persons/{slug}`. The website route must ship before Phase 1 emits person links.
- Non-routable org-unit subtypes (institution, national-consortium) resolve to the country
  page — confirmed to match the website folder structure.

## Page paths (decided)

Page slugs are single-segment (slugify strips slashes) and the `pages` table had no path or
parent column, so a page's real URL (`/about/strategy`) previously lived only in the website
folder tree and its nav-menu position. Decisions:

- **Dedicated flat `path`.** Pages get an author-controlled, unique `path` (root-relative,
  e.g. `/about/strategy`). The resolver returns it verbatim (`page → path`). `slug` stays
  single-segment for stable per-type identity/labels.
- **One page catch-all on the website.** Pages are author-created at arbitrary nested paths,
  so their render route is necessarily a single catch-all that fetches the CMS page by `path`.
- **Coexist with existing hardcoded pages.** The bespoke section folders (`about/strategy`,
  `network/regional-hubs`, …) stay and win by Next route priority (static > catch-all).
  Individual bespoke pages can be migrated into CMS pages later.

  **Validation nuance (refines the earlier "reserve typed prefixes" rule).** A page path is _not_
  blanket-rejected for matching a typed route, because **listing intro pages intentionally claim
  typed-listing paths** (`projects-list` → `/projects`). Three cases:
  - path matches a **typed listing route** → allowed; that listing folder renders it as the intro.
  - path matches **no typed route** → allowed; the page catch-all renders it.
  - path matches a **typed route that does not consume an intro page** (detail routes, `/contact`,
    `/search`, …) → reject/warn; the page would be shadowed and never render.
    So the reserved set is "typed routes that aren't intro-aware", not "all typed routes".

### Page-path workstream (new)

1. **DB:** add `pages.path` (unique, not null), backfill/migration.
2. **Validation:** normalise to a leading-slash root-relative path of slugified segments;
   enforce uniqueness; reject reserved prefixes (the website's typed routes — keep the reserved
   list next to the resolver so it travels with the route table).
3. **Form:** page-path field on the page edit form (editable while draft, like slug).
4. **API (this repo):** add `GET /api/pages/by-path?path=…` — a query param, since paths
   contain slashes and cannot be a `:path` route segment — returning the existing `PageSchema`
   (exact match on the unique `pages.path`, trailing-slash normalised), mirroring
   `getPageBySlug`. Keep it **pages-only**, not a generic `/api/resolve`: the other 12 types use
   typed routes + by-slug. Expose `path` on page responses/refs so nav/related resolve via
   `getEntityHref({ type: "page", path })`.
5. **Website (dariah-website repo):** add the page catch-all route that calls the by-path
   endpoint; add the `persons/[slug]` route (person decision).
6. **Resolver/consumers:** `page` is already routable via `{ type: "page"; path }`; wire the
   search indexer + API to pass the stored `path` (Phases 1–3). Page indexing stays disabled
   until `pages.path` exists.
