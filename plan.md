# Phase 2 Plan: Draft / Publish Lifecycle

## Goal

Implement a real draft/publish workflow for entity-backed content in the knowledge-base app.

Phase 1 already changed new entity creation to default to `published`. Phase 2 should replace that stopgap with an explicit lifecycle that supports:

- editing a draft without immediately changing the live public version
- publishing a draft to make it the public version
- keeping public/API/search consumers restricted to published content
- keeping dashboard editors able to see both draft and published state clearly

There is no production data yet, so phase 2 does not need backward-compatibility migrations or backfills beyond what is required for the new model to function in development.

## Current State

### Schema capabilities already present

The entity schema already has the shape needed for parallel versions:

- `entities.statusId` references `draft` / `published`
- `entities.documentId` groups versions of the same logical document
- uniqueness allows one row per `documentId + statusId`

Relevant file:

- [packages/database/lib/schema/entities.ts](/home/stefan/development/dariah-eric/knowledge-base/packages/database/lib/schema/entities.ts:43)

This strongly suggests the intended model is:

- one logical document
- up to one `draft` entity row
- up to one `published` entity row

### Current behavior

- Public/API/search paths only expose `published` entities.
- Search indexing skips non-published entities in [apps/knowledge-base/lib/search/website-index.ts](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/lib/search/website-index.ts:182).
- Dashboard create/edit flows currently operate on a single entity row and update it in place.
- Several edit forms already pass `documentId` as a hidden field, for example [news-item-form.tsx](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-form.tsx:148).
- Update actions currently ignore `documentId` and mutate by entity `id`, for example [update-news-item.action.ts](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/update-news-item.action.ts:48).

### Consequence

The database can represent draft and published versions, but the application currently does not. Phase 2 needs a new write model, not just buttons and labels.

## Recommended Target Model

Use `documentId` as the stable identity of a logical document, and `entities.id` as the identity of a specific version row.

For each draft/publish-capable document:

- there may be zero or one `published` entity row
- there may be zero or one `draft` entity row
- the `published` row is the only row used by public/API/search consumers
- dashboard editing should default to the `draft` row if it exists
- if no draft exists yet, "Edit draft" should create one by copying the current published row
- publishing should upsert the published row from the draft row, preserving the same `documentId`

This keeps public reads simple and uses the existing uniqueness constraints instead of fighting them.

## Scope

### In scope

- Website content entities:
  - news
  - pages
  - events
  - documents/policies
  - spotlight articles
  - impact case studies
  - opportunities
  - funding calls
- Administrator entity-backed content that uses the same entity/status pattern:
  - persons
  - projects
  - countries / organisational units
  - institutions
  - governance bodies
  - national consortia
  - working groups
  - documentation pages

### Out of scope for first phase of phase 2

- workflow roles/approval chains
- scheduling future publication
- audit trail / revision history beyond one draft and one published row
- diff views between draft and published
- reporting/service-specific status systems unrelated to `entities.statusId`

## Key Design Decisions To Settle First

Implementers should resolve these before broad code changes:

1. Canonical edit target
   - Recommendation: dashboard editing targets the draft row.
   - If only a published row exists, create a draft copy on demand.

2. Publish semantics
   - Recommendation: publish should copy draft content into the published row for the same `documentId`.
   - If no published row exists yet, create one.
   - If one exists, replace its content in a transaction.

3. Unpublish semantics
   - Recommendation: do not implement in the first iteration unless explicitly requested.
   - A "revert draft" action is lower-risk and more useful initially than unpublish.

4. Slug behavior
   - Recommendation: draft and published versions of the same document should keep the same slug.
   - If slug edits are allowed in draft, publishing must atomically update the published slug and search index.

5. Relation/content block cloning
   - Recommendation: treat the draft entity row as a full copy with its own typed content blocks, field rows, entity relations, resource relations, and subtype row data.

## Workstreams

### 1. Introduce lifecycle primitives

Create shared helpers so the feature is not reimplemented per entity type.

Suggested new module area:

- `apps/knowledge-base/lib/entities/` or similar

Suggested helper responsibilities:

- get entity status IDs by type
- resolve document versions by `documentId`
- create draft from published
- publish draft to published
- discard/recreate draft
- load preferred dashboard version for editing

Suggested helper API shape:

- `getDocumentVersions(documentId)`
- `ensureDraftEntity(documentId)`
- `publishDocument(documentId)`
- `getEditableEntityBySlug(...)`

These helpers should own the status transitions and cross-table cloning rules.

### 2. Normalize read paths around document/version concepts

Current dashboard reads are inconsistent: some list views use shared loaders, while many detail/edit pages query the subtype table directly by slug.

Phase 2 should define two read modes:

- public mode: published only
- dashboard mode:
  - list view should show publication state
  - edit/detail should resolve to draft if present, otherwise published

Concrete tasks:

- add dashboard data loaders that return:
  - `documentId`
  - current editable entity ID
  - published entity ID, if any
  - draft entity ID, if any
  - current status summary
- stop relying on ad hoc direct `db.query.*.findFirst({ where: { entity: { slug }}})` for edit routing
- make edit pages load by `documentId` or via a lifecycle-aware slug resolver

### 3. Update create flow

Replace phase-1 "create as published" behavior with explicit lifecycle behavior.

Recommendation:

- create new documents as `draft`
- redirect to the draft edit/details flow
- expose a publish action in the dashboard

Concrete tasks:

- update all create actions changed in phase 1 to create `draft` rows again
- ensure create actions initialize a fresh `documentId`
- ensure draft creation also initializes subtype rows, fields, relations, and content blocks as today

### 4. Update edit flow

Editing must stop mutating the published row directly.

Concrete tasks:

- update edit actions to target the draft entity row
- if the user lands on edit for a published-only document, create a draft first
- update validation schemas to accept/use `documentId` where needed
- keep `id` as the version row identifier, but derive it from lifecycle-aware lookup rather than trusting stale form state alone

Important:

- current forms already include `documentId` in several places; use that to drive lifecycle-aware resolution
- confirm all entity forms include it, then make it universal

### 5. Add publish and draft-management server actions

Add dedicated actions, likely per entity area or via shared helpers:

- `publish-<entity>.action.ts` or a generic `publish-document.action.ts`
- optional `discard-draft.action.ts`
- optional `create-draft-from-published.action.ts` if not implicit

Publish action requirements:

- run in a transaction
- upsert the published entity row for the same `documentId`
- copy subtype data
- replace copied fields/content blocks/relations deterministically
- trigger the same revalidation/webhook/search sync paths currently used after edits

### 6. Add lifecycle UI

Every draft/publish-capable dashboard screen should visibly communicate state.

Minimum UI:

- show current state badge: `Draft`, `Published`, `Draft + Published`
- add a `Publish` button on edit/detail pages
- show whether the current editor is editing draft or published fallback
- if a published version exists and a draft differs, make it clear that changes are not yet live

Useful follow-ups:

- `Discard draft` button
- `Create draft` button from a published-only item
- separate "view live" and "edit draft" links

Probable affected areas:

- form components under `apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/**/_components`
- list pages under `.../dashboard/**/page.tsx`

### 7. Keep public consumers strictly published

Public/API/search consumers should remain published-only, but the implementation should be audited after the lifecycle changes.

Check:

- API services under `apps/api/src/routes/**/service.ts`
- website search sync in [website-index.ts](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/lib/search/website-index.ts:182)
- default website pages under `apps/knowledge-base/app/(app)/[locale]/(default)`

Requirement:

- no public read should accidentally resolve a draft because of shared helper reuse

### 8. Add tests

This feature needs integration tests more than unit tests.

Minimum scenarios:

1. Create draft-only document
   - not visible in public/API/search
   - visible in dashboard

2. Publish draft
   - visible in public/API/search
   - slug and content match draft

3. Edit published document
   - creates or uses draft
   - public/API/search still show old published content until publish

4. Re-publish updated draft
   - public/API/search now show new content

5. Relations/content blocks clone correctly
   - publish preserves nested content and relationships

6. Unique constraints hold
   - cannot create two drafts or two published rows for one `documentId`

Suggested test levels:

- server action integration tests where feasible
- API tests for published-only visibility
- targeted UI tests only after behavior stabilizes

## Implementation Order

Recommended sequence for follow-on agents:

1. Build shared lifecycle helpers and document-version queries.
2. Implement one vertical slice end-to-end for `news`.
3. Validate the vertical slice with tests.
4. Generalize the helper approach to the other website entities.
5. Extend the same pattern to administrator entity-backed content.
6. Add shared UI state badges/buttons.
7. Audit all public/API/search consumers for published-only guarantees.

Starting with one vertical slice is important. The entity types share patterns, but not every subtype table has identical fields and relation behavior.

## Suggested Vertical Slice: `news`

Use `news` as the first implementation target because it has:

- create action
- update action
- list page
- details page
- edit page
- content blocks
- entity/resource relations
- API exposure
- search sync

Key files:

- [apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/create-news-item.action.ts](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/create-news-item.action.ts:1)
- [apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/update-news-item.action.ts](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_lib/update-news-item.action.ts:1)
- [apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/[slug]/edit/page.tsx](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/[slug]/edit/page.tsx:1)
- [apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-form.tsx](/home/stefan/development/dariah-eric/knowledge-base/apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-item-form.tsx:1)
- [apps/api/src/routes/news/service.ts](/home/stefan/development/dariah-eric/knowledge-base/apps/api/src/routes/news/service.ts:1)

After the `news` slice works, reuse the same lifecycle helper pattern everywhere else.

## Risks

### Copy logic drift

If each entity type hand-rolls cloning/publishing logic, the behavior will diverge. Prefer shared primitives plus thin per-entity adapters.

### Stale entity IDs in forms

Forms currently post `id` and sometimes `documentId`. After lifecycle changes, `documentId` should be the stable reference and `id` should be treated as a version-row hint, not the source of truth.

### Search/webhook inconsistencies

Publishing must trigger the same side effects as current edits. Draft saves should generally not make public search documents appear.

### Slug collisions and routing

Publishing a renamed draft must handle slug updates atomically so dashboard and public routes do not temporarily disagree.

## Definition of Done

Phase 2 is complete when:

- new entity-backed content starts as `draft`
- dashboard editing targets draft state
- published content remains unchanged until an explicit publish action
- publish updates the public/API/search-visible version
- status is visible in dashboard UI
- the behavior is implemented through shared lifecycle helpers, not one-off per-page hacks
- at least one strong test suite covers draft-only, publish, edit-after-publish, and republish flows

## Notes For Follow-On Agents

- Do not revert the phase-1 changes blindly; use them as the current baseline and replace them intentionally.
- Expect to touch both server actions and page/data-loading code.
- Expect the largest design work to be around cloning subtype rows, fields, content blocks, and relations safely inside transactions.
- If the helper design starts to sprawl, stop and standardize the lifecycle abstraction before extending to more entity types.
