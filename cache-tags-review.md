# Cache-tag review: `x-cache-tags` vs. dispatched webhook tags

Status: review done, **nothing changed yet**. Snapshot as of 2026-10-06, on `main` at `9005d9ba`.

## How the system works

- Tag vocabulary: `packages/cache-tags/lib/index.ts`. A tag names a slice of api data, not a website
  page.
- Read side: every api operation declares the tags it reads under `x-cache-tags`, through the
  `describeRoute` wrapper in `apps/api/src/lib/openapi/describe-route.ts`. Each route file
  (`apps/api/src/routes/*/index.ts`) currently uses **one tag array for all operations in the
  route**: list, slugs, by-id and by-slug all share it.
- Write side: dashboard mutations call `dispatchWebhook({ tags })` or
  `dispatchWebhookForEntityType(...)` in `apps/knowledge-base/lib/webhook/dispatch-webhook.ts`.
  That module already expands some dispatches on the dispatch side: when a mutation touches
  `members-partners` or `working-groups`, it scans for published documents whose richtext embeds
  placeholder values and adds those documents' tags.
- Consumers tag their fetches with each operation's `x-cache-tags` and call `revalidateTag` for
  each tag the webhook delivers (see `apps/website/app/api/revalidate/route.ts`). The website in
  this repo doesn't tag its fetches yet; the real consumer is the separate website repo.
- **Safety net:** consumers also use a time-based cache life. Because of that, cosmetic
  staleness can be left to the cache life. Use a targeted dispatch only where staleness breaks
  something (dead hrefs, deleted assets) or is clearly visible.

## Guiding decision from the user (2026-10-06)

`site-metadata` feeds the website shell rendered on every page, so it must **not** be revalidated
by broad tags such as `assets` or `social-media`. In general: balance precision against
over-revalidation. Prefer declaring narrow tags on the operation and doing a precise expansion on
the dispatch side (the same approach as the placeholder-value scan). Leave cosmetic cases to the
cache life.

## Agreed plan for `site-metadata` (ready to implement)

`getSiteMetadata` (`apps/api/src/routes/site-metadata/index.ts:20`) currently declares
`["assets", "members-partners", "site-metadata", "social-media"]`. Change it to
**`["site-metadata"]`** and make the dispatch side precise:

| Data served by site-metadata | Mutation | Action |
|---|---|---|
| title, description, OG title/description | `update-site-metadata` | already dispatches `site-metadata` |
| ERIC email and social-media links (`dariah-eu` org unit of type `eric`) | `administrator/eric/_lib/update-eric.action.ts`, `publish-eric.action.ts` | dispatch `site-metadata` **instead of** `members-partners` |
| URL, name or duration of an ERIC social-media account | `administrator/social-media/_lib/update-social-media.action.ts`, `maintenance/_lib/merge-social-media.action.ts` | also dispatch `site-metadata` **only if** the account is linked to the ERIC (look up `organisational_units_to_social_media`) |
| OG image alt, caption, licence | `update-asset-metadata` | no dispatch; leave it to the cache life (metadata edits never change the image url) |
| OG image asset replaced by a duplicate (url changes) | `merge-duplicate-assets` | dispatch `site-metadata` only if `og_image_id` pointed at a merged id (see finding 5) |

Why ERIC edits shouldn't dispatch `members-partners`: the ERIC is not part of the
members-partners data. `update-eric` edits the ERIC's own fields, content blocks, social media and
related entities. It doesn't edit the unit relations that decide membership; those relation
actions already dispatch `members-partners` and `working-groups`. Other routes (institutions,
working-groups, members-partners) only use the ERIC as a filter ("has an active relation to the
published `dariah-eu`") and read none of its fields. Dispatching `members-partners` today
invalidates members-partners, institutions, national-consortia, statistics, sitemap, persons and
social-media, and it starts the placeholder-value scan.

ERIC data that also appears elsewhere: person positions (if someone holds a role at the ERIC) and
dariah-projects partners (the ERIC's name and social media, and DARIAH's own role on each
project). Handle those together with findings 1–3 below, not as part of the site-metadata
change.

## Findings: under-revalidation (stale content)

### 1. Links to other entities (affects most detail operations), needs a design decision

Two helpers fill in another entity's title, slug, href and publish state at request time:

- richtext entity links: `annotateEntityLinks` in `apps/api/src/lib/content-blocks.ts`, through
  `getEntityRefsByDocumentId`
- related entities: `getRelatedEntities` in `apps/api/src/lib/relations.ts`

The referenced entity can be of any type. For institutions and national consortia, the href also
depends on the country slug, which comes from members-partners relations. No operation declares
tags for those types. Affected: every by-id and by-slug operation that uses `getContentBlocks` or
`getRelatedEntities`. That covers events, funding-calls, news, opportunities, pages,
impact-case-studies, spotlight-articles, governance-bodies, working-groups, members-partners,
dariah-projects, projects, persons and documents-policies.

Failure: rename or re-slug entity X, and documents that link to X keep the old label and a dead
href. Publishing a draft that a document already links to doesn't make the link resolve either.
`update-entity-slug` only adds `navigation`.

Navigation has the same problem on a smaller scale (`routes/navigation/service.ts`). An entity
item appears only once the entity is published, but publishing it doesn't dispatch `navigation`.
An institution's href depends on its country.

Proposed direction: don't declare every tag everywhere, which would invalidate everything on every
edit. Instead, do a reverse-reference expansion on the dispatch side, similar to the placeholder
scan: when entity X changes, find documents that reference X (`entities_to_entities`, richtext
entity-link nodes, `navigation_items.entity_id`) and add their types' tags. This requires
`dispatchWebhook` to receive entity ids, not only tags. Per the guiding decision, a label change
may be acceptable to leave to the cache life. Slug changes, which produce dead links, are the
priority.

### 2. Person positions refer to organisational units of every type

`getPersonPositions` (`apps/api/src/lib/persons.ts`) returns the name, slug and href of governance
bodies, working groups, countries, institutions, national consortia and the ERIC. Only `persons`
declares all of the matching tags.

| Operations (only those that embed positions) | Missing tags |
|---|---|
| governance-bodies (all ops) | `working-groups`, `members-partners` |
| working-groups by id/slug (`getChairs`) | `governance-bodies`, `members-partners` |
| members-partners by id/slug (`getContributors`) | `governance-bodies`, `working-groups` |
| impact-case-studies, spotlight-articles by id/slug (`getContributors`) | `governance-bodies`, `members-partners`, `working-groups` |

Concrete bug: the hard-coded "Working groups" governance body
(`getHardcodedWorkingGroupsGovernanceBody` / `getActiveWorkingGroupChairs` in
`routes/governance-bodies/service.ts`) lists chairs of **published** working groups. Publishing a
working group dispatches only `working-groups`, so governance-bodies goes stale.

### 3. Project partners

`getPublishedProjectPartners` / `getPublishedProjectPartnersByDocuments`
(`apps/api/src/lib/project-partners.ts`) return each partner unit's name, slug, type, publish
state and social media. `projects` and `dariah-projects` declare
`["assets", "projects", "social-media"]` and are missing `members-partners`. They may also need
`working-groups` and `governance-bodies` if those unit types can be partners. Renaming or
unpublishing a partner institution doesn't refresh projects.

### 4. `documents-policies` is missing `assets`

All its operations declare only `["documents-policies"]`. The by-id and by-slug operations return
`document.{label, filename, mimeType}` (an asset, editable through `update-asset-metadata`; the
label is an editable field) and content blocks with images and asset links. The two file-download
operations (`getDocumentOrPolicyFileById` / `getDocumentOrPolicyFileBySlug`) use the asset for
`Content-Disposition`. Add `assets` to those operations only, not to the list, tree or slug
operations.

### 5. Gaps on the dispatch side (`apps/knowledge-base/lib/webhook/dispatch-webhook.ts`)

- `cacheTagsByEntityType.organisational_units` (line 32) is `["members-partners", "working-groups"]`
  and leaves out **`governance-bodies`**. As a result, a governance body's slug change
  (`update-entity-slug`) or merge (`merge-entities`), `dispatchWebhookForAllContent` (used by
  clean-richtext and delete-empty-content-blocks) and the placeholder scan all skip
  governance-bodies operations.
- `maintenance/_lib/merge-duplicate-assets.action.ts` dispatches **nothing**. `mergeDuplicateAssets`
  (`packages/database/lib/asset-deduplication-service.ts`) repoints **every** foreign key to
  `assets`; the columns come from `pg_constraint` through `getForeignKeyColumns` in
  `packages/database/lib/cleanup-references.ts`. That includes `site_metadata.og_image_id`
  (verified). It also rewrites stale asset keys inside every json/jsonb column (richtext). It does
  **not** delete the duplicate assets; they become unreferenced. Failure: cached api responses
  keep the duplicates' keys, and they still resolve until the duplicates are removed by
  `delete-unused-assets` (`maintenance/_lib/delete-unused-assets.action.ts`, which deletes the
  storage object, sees no database references and dispatches nothing either). From then on the
  cached image urls are broken until the cache life runs out. The canonical asset's alt text,
  caption and licence may also differ (cosmetic). Fix: dispatch `assets` from the merge, which
  covers everything once finding 4 is fixed, plus `site-metadata` only if
  `site_metadata.og_image_id` pointed at one of the merged ids before the merge.

## Findings: over-revalidation (low cost)

These follow from the one-tag-array-per-route pattern. The fix is to declare tags per operation.

- **All `*Slugs` operations** return only `{ id, slug }` plus pagination (see the `*SlugSchema` in
  each `routes/*/schemas.ts`). They need only their own tag. Most also carry `assets`, and several
  carry `persons` and `social-media`. `getPersonSlugs` carries six extra tags.
- **List operations without contributors:** the impact-case-studies, spotlight-articles,
  working-groups and members-partners lists don't embed persons but declare `persons`. The
  persons list declares `impact-case-studies` and `spotlight-articles`, but articles appear only
  on the person detail (`getPersonArticles`).
- **`getAssetImage`** (`routes/assets/index.ts:77`) is an immutable redirect by storage key;
  metadata edits can't change it. `getAssetDownload` does need `assets` (`Content-Disposition`).
- **`site-metadata`**: see the agreed plan above.

## Correct as declared

sitemap, statistics (a database view over org units and relations → `members-partners`,
`working-groups`), social-media (reads accounts plus linked published org units of any type),
announcements, featured-entities (`site_metadata.featured_item_ids` plus news, opportunities,
funding calls and events), institutions, national-consortia, the lists of events, news,
opportunities, funding-calls and pages, and newsletters (`[]`, not managed by the dashboard).

## Not fixable with tags

Some responses depend on the current time (`NOW()`): current vs. former positions, chair
filters, active social media and ended durations. These go stale without any edit, so the
consumer's cache life covers them.

## Suggested order of work

1. site-metadata plan (agreed, small).
2. Add `governance-bodies` to the `organisational_units` mapping; give `merge-duplicate-assets` a
   dispatch.
3. Per-operation tag arrays: fix findings 2–4 and the over-revalidation together.
4. Finding 1 (reverse-reference dispatch): needs a design discussion with the user first.
