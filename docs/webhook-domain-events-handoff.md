# KB Webhook Domain Events Handoff

## Context

The KB currently calls `dispatchWebhook` from server actions when public data changes. The practical consumer today is the DARIAH website revalidation endpoint, but the webhook producer should not speak in website/cache-tag terms. The target is a KB-owned change-event contract that can notify any future consumer about KB data changes, while each consumer maps those events to its own behavior.

The third-party website consumes KB data via the Hono API server, so the integration has two sides:

- KB server actions emit domain-level change events.
- The website receives those events and maps them to its own cache tags for `revalidateTag`.

## Suggested Target Design

1. Define the webhook contract in KB domain terms only.
   Use entity types, organisational-unit subtypes, and relation concepts. Avoid cache-tag names such as `members-partners`, `working-groups`, or `governance-bodies`.

2. Keep cache-tag mapping entirely on the website side.
   The website can translate KB events into `revalidateTag` calls.

3. Make dispatch support multiple registered webhooks.
   The current implementation still has a singular env URL/secret. A small registry abstraction would allow fan-out with isolated failure logging.

4. Emit only for public/API-visible changes unless a wider event model is explicitly desired.
   Current behavior mostly emits after publish/save-and-publish or after mutations that affect already-public relation data. Draft-only changes generally do not notify the website.

5. Test both boundaries.
   KB tests should assert emitted payloads. Website tests should assert event-to-cache-tag mapping.

## Current Branch State

Branch: `fix/revalidation`

The branch already moves the KB side in the right direction:

- `apps/knowledge-base/lib/webhook/dispatch-webhook.ts`
  - Adds `WebhookEntityType`.
  - Adds organisational-unit subtype events as ``organisational-units:${OrganisationalUnitType}``.
  - Allows `dispatchWebhook({ type })` to accept a single type or an array.
  - Deduplicates types and posts `{ types }`.

- `apps/knowledge-base/lib/webhook/resolve-organisational-unit-webhook-types.ts`
  - New untracked file.
  - Resolves organisational-unit document ids to subtype webhook events.
  - Useful for unit-unit relation and contribution mutations.

- Many KB server actions now emit org-unit subtype events rather than old website-facing strings:
  - Countries, institutions, national consortia, ERIC, governance bodies, working groups.
  - Unit-unit relation create/update/end/delete.
  - Delegated country-dashboard unit relation create/update/end/delete.
  - Person contribution create/update/end/delete now emits `persons` plus affected org-unit subtype.

## Main Gaps Found

### 1. Producer and consumer payloads do not match

KB now posts:

```json
{ "types": ["organisational-units:institution", "persons"] }
```

The website route still expects singular:

```ts
const body = (await request.json()) as { type?: string };
const entityType = body.type as EntityType | undefined;
```

File:

- `apps/website/app/api/revalidate/route.ts`

This route will reject the current KB payload with `400 Bad Request`.

### 2. Website still accepts website/cache-facing event names

The website endpoint still defines events such as:

- `members-partners`
- `governance-bodies`
- `working-groups`

Those should become consumer-side cache tags only. The website should accept KB-domain events and map them to these tags internally.

### 3. KB event names are not fully KB-domain clean yet

`WebhookEntityType` still includes `dariah-projects`, but the KB/database entity type is `projects`.

Also, many event strings are kebab route/cache names rather than DB/domain enum names:

- `documents-policies` vs `documents_policies`
- `funding-calls` vs `funding_calls`
- `impact-case-studies` vs `impact_case_studies`
- `spotlight-articles` vs `spotlight_articles`

Recommendation: either use the database `entityTypesEnum` tokens directly, or define an explicit stable public event enum that is clearly KB-owned. If using DB enum tokens, organisational units can remain subtype-specific, e.g. `organisational_units:institution`.

Relevant DB enums:

- `packages/database/lib/schema/entities.ts`
- `packages/database/lib/schema/organisational-units.ts`

### 4. Multiple webhooks are not implemented yet

Current env/config is still singular:

- `REVALIDATION_WEBHOOK_URL`
- `REVALIDATION_WEBHOOK_SECRET`

Current dispatcher:

- `apps/knowledge-base/lib/webhook/dispatch-webhook.ts`

Suggested next step: introduce something like:

```ts
type WebhookRegistration = {
  url: string;
  secret: string;
};
```

Then resolve `Array<WebhookRegistration>` from env/config. For the first pass this can still be backed by the existing single env pair, but the dispatch logic should fan out over an array.

Avoid keeping `REVALIDATION_` terminology in new names. Prefer something like:

- `WEBHOOK_URLS`
- `KB_WEBHOOK_URLS`
- `KB_CHANGE_WEBHOOKS`

Exact env format needs a repo-style decision.

### 5. `featured-entities` is emitted but not consumed

KB emits `featured-entities` from:

- `apps/knowledge-base/app/(app)/[locale]/(dashboard)/dashboard/website/featured/_lib/update-featured-items.action.ts`

The website route does not currently accept this type. Since the website has a `home` cache tag, likely mapping is:

- `featured_entities` / `featured-entities` -> `home`

Confirm the intended cache dependencies before finalizing.

### 6. `regional_hub` needs an explicit consumer decision

Organisational-unit subtypes include:

- `governance_body`
- `national_consortium`
- `country`
- `institution`
- `regional_hub`
- `eric`
- `working_group`

The website mapping must decide whether `regional_hub` maps to a public cache tag or is accepted as a no-op. Do not let it become an accidental `400` if it is a valid KB event.

## Suggested Website Mapping

If keeping string events, a likely mapping is:

```ts
const eventToCacheTags = {
  projects: [cacheTags.projects, cacheTags.dariahProjects],
  documents_policies: [cacheTags.documentsPolicies],
  events: [cacheTags.events],
  featured_entities: [cacheTags.home],
  funding_calls: [cacheTags.fundingCalls],
  impact_case_studies: [cacheTags.impactCaseStudies],
  navigation: [cacheTags.navigation],
  news: [cacheTags.news],
  opportunities: [cacheTags.opportunities],
  pages: [cacheTags.pages],
  persons: [cacheTags.persons],
  site_metadata: [cacheTags.siteMetadata],
  spotlight_articles: [cacheTags.spotlightArticles],

  "organisational_units:country": [cacheTags.membersAndPartners],
  "organisational_units:institution": [cacheTags.membersAndPartners],
  "organisational_units:national_consortium": [cacheTags.membersAndPartners],
  "organisational_units:eric": [cacheTags.membersAndPartners],
  "organisational_units:governance_body": [cacheTags.governanceBodies],
  "organisational_units:working_group": [cacheTags.workingGroups],
  "organisational_units:regional_hub": [],
} as const;
```

If retaining the branch's current hyphenated format temporarily, adapt this to `organisational-units:*` and existing kebab names, but that leaves the KB contract less clean.

## Suggested Payload Shape

Minimal string-array version:

```json
{
  "events": ["projects", "organisational_units:institution", "persons"]
}
```

Better structured version:

```json
{
  "events": [
    { "kind": "entity", "type": "projects" },
    { "kind": "organisational_unit", "type": "institution" },
    { "kind": "entity", "type": "persons" }
  ]
}
```

The structured version is more future-proof for relation events, but the string-array version is less invasive from the current branch.

## Suggested Next Steps

1. Decide the canonical event names.
   Recommendation: DB/domain enum names, with `organisational_units:${subtype}` for org-unit subtypes.

2. Rename `WebhookEntityType` to a domain name.
   Examples: `KnowledgeBaseChangeEvent`, `KbChangeEventType`, or `WebhookEventType`.

3. Rename `payload.type` to `events` or `eventTypes`.
   The current `type` field accepting arrays is awkward.

4. Update `dispatchWebhook` to send the final envelope.
   Also replace revalidation-specific log messages with webhook/change-event language.

5. Update the website route to accept the final envelope and map events to cache tags.
   It should deduplicate tags before calling `revalidateTag`.

6. Add or update tests.
   - KB: dispatcher payload shape, deduplication, org-unit resolver.
   - Website: event payload validation and event-to-cache-tag mapping.

7. Add the new resolver file to git.
   Current `git status` showed:

```txt
?? apps/knowledge-base/lib/webhook/resolve-organisational-unit-webhook-types.ts
```

8. Consider env migration.
   Keep backwards compatibility with `REVALIDATION_WEBHOOK_URL` for one release if useful, but document the new config names.

## Files To Inspect First

- `apps/knowledge-base/lib/webhook/dispatch-webhook.ts`
- `apps/knowledge-base/lib/webhook/resolve-organisational-unit-webhook-types.ts`
- `apps/website/app/api/revalidate/route.ts`
- `apps/knowledge-base/config/env.config.ts`
- `apps/website/config/env.config.ts`
- `packages/database/lib/schema/entities.ts`
- `packages/database/lib/schema/organisational-units.ts`

## Notes

- The local monorepo includes `apps/website`, but the user specifically mentioned the external `https://github.com/dariah-eric/dariah-website`. The same consumer-side changes likely need to be applied there if it is a separate deployment/repo.
- I attempted to inspect the GitHub repo with the web tool, but the repository contents were not available through that tool during this pass.
- I did not make source changes or run tests during the investigation. This document captures the analysis and recommended finish-line work.
