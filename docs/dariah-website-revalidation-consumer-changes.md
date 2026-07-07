# DARIAH website: change-event webhook consumer changes

This document describes the changes needed on the **consumer** side
(`dariah-eric/dariah-website`) to accept the new KB change-event webhook contract, **plus** a set of
endpoint→cache-tag pairing fixes found by cross-referencing the website's cached fetches against what
the KB API endpoints actually query.

The KB (producer) side is already done on branch `fix/revalidate-no-cache-tags`.

Files on the website:

- `app/api/revalidate/route.ts` — the webhook receiver.
- `lib/data/api-client.ts` — defines `cacheTags` and every `nextCache(...)`-wrapped fetch + its tags.

> The analysis below was done against a clone of `dariah-eric/dariah-website` cross-referenced with
> the KB API services in `apps/api/src/routes/*` and the `statistics` DB view. Line numbers refer to
> the website repo at clone time; re-locate by symbol if they drift.

---

## Part 1 — Accept the new payload contract

### What the KB now sends

The KB emits **KB-domain change events** and posts a **flat array** under an `events` key. The consumer
maps events to its own cache tags. Auth header and env var names are unchanged
(`REVALIDATION_WEBHOOK_SECRET`).

```http
POST <REVALIDATION_WEBHOOK_URL>
Authorization: Bearer <REVALIDATION_WEBHOOK_SECRET>
Content-Type: application/json

{ "events": ["projects", "organisational_units:institution", "persons"] }
```

- `events` is **always** a JSON array of strings (deduplicated by the producer).

### What it used to send (must stop being accepted)

```json
{ "type": "members-partners" }
```

A single `type` string carrying **website cache-tag names** (`members-partners`, `governance-bodies`,
`working-groups`). Those names are gone from the wire — they are consumer-side cache tags only now.

### Full event vocabulary the KB can emit

Entity-level (mirror the KB `entityTypesEnum`, snake_case):

`projects`, `documents_policies`, `events`, `featured_entities`, `funding_calls`,
`impact_case_studies`, `navigation`, `opportunities`, `news`, `pages`, `persons`, `site_metadata`,
`spotlight_articles`

Organisational-unit subtypes, formatted `organisational_units:<subtype>`:

`governance_body`, `national_consortium`, `country`, `institution`, `regional_hub`, `eric`,
`working_group`

---

## Part 2 — Verified endpoint → cache-tag map

This is the **verified** mapping (corrected against the actual `dariah-website` `cacheTags` and the KB
queries — it differs from naive guesses). The `cacheTags` registry itself does not need new entries.

```ts
type KnowledgeBaseChangeEvent =
	| "projects"
	| "documents_policies"
	| "events"
	| "featured_entities"
	| "funding_calls"
	| "impact_case_studies"
	| "navigation"
	| "opportunities"
	| "news"
	| "pages"
	| "persons"
	| "site_metadata"
	| "spotlight_articles"
	| "organisational_units:governance_body"
	| "organisational_units:national_consortium"
	| "organisational_units:country"
	| "organisational_units:institution"
	| "organisational_units:regional_hub"
	| "organisational_units:eric"
	| "organisational_units:working_group";

const eventToCacheTags: Record<
	KnowledgeBaseChangeEvent,
	Array<(typeof cacheTags)[keyof typeof cacheTags]>
> = {
	projects: [cacheTags.dariahProjects], // NOTE: there is no separate `projects` tag in dariah-website
	documents_policies: [cacheTags.documentsPolicies],
	events: [cacheTags.events],
	featured_entities: [cacheTags.featuredEntities], // co-invalidates home (home fetch carries this tag)
	funding_calls: [cacheTags.fundingCalls],
	impact_case_studies: [cacheTags.impactCaseStudies],
	navigation: [cacheTags.navigation],
	opportunities: [cacheTags.opportunities],
	news: [cacheTags.news], // co-invalidates home (home fetch carries this tag)
	pages: [cacheTags.pages],
	persons: [cacheTags.persons],
	site_metadata: [cacheTags.siteMetadata],
	spotlight_articles: [cacheTags.spotlightArticles],

	"organisational_units:country": [cacheTags.membersAndPartners],
	"organisational_units:institution": [cacheTags.membersAndPartners],
	// `nationalConsortia` assumes the Issue C tag fix is applied; until then this fetch is tagged
	// `cacheTags.newsletters` (the copy-paste bug), so use that instead if shipping the route first.
	"organisational_units:national_consortium": [
		cacheTags.membersAndPartners,
		cacheTags.nationalConsortia,
	],
	"organisational_units:eric": [cacheTags.membersAndPartners],
	"organisational_units:governance_body": [cacheTags.governanceBodies],
	"organisational_units:working_group": [cacheTags.workingGroups],
	// No public surface today — accepted no-op, must NOT 400.
	"organisational_units:regional_hub": [],
};
```

### Why each non-obvious entry is what it is (verified against KB queries)

- **`projects` → `[dariahProjects]` only.** `dariah-website` has no `projects` cache tag; both
  `_projectsBySlug` and `_projectsList` are tagged `dariahProjects` against `/api/v1/dariah-projects`.
- **`featured_entities` → `[featuredEntities]`.** The KB `featured-entities` endpoint reads
  `siteMetadata.featuredItemIds` and the referenced `news` rows. It is only consumed by the home page
  fetch, which is tagged `featuredEntities` — so revalidating `featuredEntities` invalidates the home
  page. (Underlying news edits already emit `news`, which the home fetch is also tagged with.)
- **`news` co-invalidates home.** The home fetch (`/events`, `/news`, `/featured-entities`,
  `/statistics`) is tagged `[home, events, featuredEntities, news]`, so `news`/`events`/
  `featured_entities` all refresh the homepage.
- **All four membership subtypes (`country`, `institution`, `national_consortium`, `eric`) →
  `membersAndPartners`.** The `/members-partners` detail endpoint embeds, for a member country: its
  partner / cooperating / national-coordinating / national-representative **institutions** (resolved
  through `organisational_units_to_units` relations), its **national consortium**, its **person
  contributors**, and related entities. So a change to any of those subtypes must invalidate
  `membersAndPartners`. (`institution` is **not** surfaced by a standalone endpoint — the website does
  not call `/api/v1/institutions` — it only appears inside members-partners and the statistics.)
- **`national_consortium` also → `nationalConsortia`.** National consortia appear inside
  members-partners (hence `membersAndPartners`) and on the standalone `/national-consortia` fetch. That
  fetch is currently mis-tagged `cacheTags.newsletters` — a copy-paste bug; see Issue C, which
  recommends retagging it to `cacheTags.nationalConsortia`.
- **`governance_body` → `governanceBodies` only** (no membersAndPartners). Governance bodies are a
  separate endpoint; they embed person contributors, already covered by the `persons` tag the website
  attaches to that fetch.
- **`persons` is sufficient for embedded contributors** — but only where the website actually tags the
  fetch with `persons`. See Issue B: two endpoints embed contributors without the `persons` tag.

---

## Part 3 — Endpoint→tag pairing issues found (fix on the website)

Cross-referencing the website's `nextCache(...)` tag lists against the KB queries surfaced three
correctness gaps. These are **website-side** caching bugs; fixing the event map alone does not fully
fix them.

### Issue A — Homepage statistics never invalidate on membership / working-group changes

`_homePageGet` fetches `/api/v1/statistics` but is tagged only
`[home, events, featuredEntities, news]`.

The KB `statistics` view derives:

- `member_countries` — `country` units `is_member_of` dariah-eu
- `partner_institutions` — `institution` units `is_partner_institution_of` / `is_national_coordinating_institution_in`
- `cooperating_partners` — `institution` units `is_cooperating_partner_of`
- `working_groups` — `working_group` units `is_part_of` dariah-eu

So when memberships or working groups change, the homepage counters stay stale until the 3600s TTL.

**Recommended fix (cleanest):** add the org-unit tags to the home fetch's `tags`:

```ts
tags: [
	cacheTags.home,
	cacheTags.events,
	cacheTags.featuredEntities,
	cacheTags.news,
	cacheTags.membersAndPartners, // statistics: member countries, partner & cooperating institutions
	cacheTags.workingGroups,      // statistics: working groups count
],
```

With this, the verified event map above already covers the homepage (no `home` entries needed in the
map). **Alternative** if you cannot touch the home data layer: add `cacheTags.home` to the
`country` / `institution` / `working_group` entries in `eventToCacheTags` instead.

### Issue B — Impact-case-study and spotlight-article detail pages embed contributors but aren't tagged `persons`

The KB `getImpactCaseStudyBySlug` / `getImpactCaseStudyById` and the spotlight-article equivalents
embed **person contributors** (name, image, position). But `_impactCaseStudiesBySlug` and
`_spotlightArticlesBySlug` are tagged only `[impactCaseStudies]` / `[spotlightArticles]`.

Result: when a person's name/image changes (KB emits `persons`), those pages don't revalidate.

This is inconsistent with `_governanceBodiesBySlug`, `_membersAndPartnersBySlug`, and
`_workingGroupsBySlug`, which **do** carry `persons`.

**Fix:** add `cacheTags.persons` to both detail fetches (the `bySlug`/`byId` variants only — the list
and slugs endpoints do not embed contributors, so leave those as-is):

```ts
// _impactCaseStudiesBySlug
{ revalidate: 3600, tags: [cacheTags.impactCaseStudies, cacheTags.persons] }
// _spotlightArticlesBySlug
{ revalidate: 3600, tags: [cacheTags.spotlightArticles, cacheTags.persons] }
```

(Contributor add/remove on the article itself is already covered: the KB emits `impact_case_studies` /
`spotlight_articles` for those mutations.)

### Issue C — `national-consortia` is mis-tagged `newsletters` (copy-paste bug)

`cacheTags.nationalConsortia` is defined but **never used** as a revalidation tag. The
`/api/v1/national-consortia` fetch (`client.nationalConsortia.list`) is instead tagged
`cacheTags.newsletters`.

This is a **bug**, not a design choice: the `nationalConsortia.list` block is a near-verbatim copy of
the `newsletters.list` block immediately below it, and the `[cacheTags.newsletters]` cache key + tag
were carried over without being changed to `nationalConsortia`. Two consequences today:

- Editing a national consortium cannot be targeted-revalidated under its own tag.
- Revalidating the Mailchimp-backed `newsletters` cache needlessly drops the national-consortia cache
  too (and vice versa).

**Fix:** retag the `/national-consortia` fetch with the dedicated tag (both the `cache()` key array and
the `tags` option):

```ts
// client.nationalConsortia.list
nextCache(
	async function list(...) {
		/* GET /api/v1/national-consortia */
	},
	[cacheTags.nationalConsortia],
	{ revalidate: 3600, tags: [cacheTags.nationalConsortia] },
);
```

Then map:

```ts
"organisational_units:national_consortium": [cacheTags.membersAndPartners, cacheTags.nationalConsortia],
```

(`newsletters.list` keeps `cacheTags.newsletters` — only `nationalConsortia.list` is wrong.)

> Note: `/api/v1/newsletters` is backed by Mailchimp, not the KB database, so it is **never**
> webhook-revalidated (TTL only) — that is expected, no event maps to it.

---

## Part 4 — Route handler changes (`app/api/revalidate/route.ts`)

Replace the single-`type` parse + the old cache-tag-keyed map with the array parse + the verified
`eventToCacheTags`:

```ts
const body = (await request.json()) as { events?: Array<string> };
const events = body.events;

if (events == null || !Array.isArray(events) || events.length === 0) {
	return NextResponse.json({ message: "Bad Request" }, { status: 400 });
}

// Unknown events are ignored rather than rejected, so adding a new KB event never 400s an old website
// deploy. Do NOT reject known-but-unmapped events such as `organisational_units:regional_hub`.
const tags = new Set<string>();
for (const event of events) {
	const mapped = eventToCacheTags[event as KnowledgeBaseChangeEvent];
	if (mapped != null) {
		for (const tag of mapped) {
			tags.add(tag);
		}
	}
}

log.info("[change-event webhook] received request", { events, tags: [...tags] });

for (const tag of tags) {
	revalidateTag(tag, "max");
}

return NextResponse.json({ revalidated: true });
```

Keep the existing secret check and the `404`-when-secret-missing behavior.

---

## Part 5 — Tests to add (website side)

- Valid `{ events: [...] }` maps to the expected deduplicated tags; `revalidateTag` called once per tag.
- Overlapping membership events (e.g. `organisational_units:country` + `:institution`) revalidate
  `members-partners` only once.
- `organisational_units:regional_hub` → `200`, no `revalidateTag` calls (no-op, not `400`).
- Missing / empty / non-array `events` → `400`; wrong/absent bearer → `401`.
- Regression for Issue A: a membership/working-group event invalidates the homepage cache entry.
- Regression for Issue B: a `persons` event invalidates impact-case-study and spotlight-article detail
  pages.

---

## Summary of website changes

| #   | File                                                                            | Change                                                                                                                              |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `app/api/revalidate/route.ts`                                                   | Parse `{ events: string[] }`, map via verified `eventToCacheTags`, dedupe tags, drop old `type` parsing and cache-tag-named events. |
| 2   | `lib/data/api-client.ts` `_homePageGet`                                         | Add `membersAndPartners` + `workingGroups` to tags (Issue A — statistics).                                                          |
| 3   | `lib/data/api-client.ts` `_impactCaseStudiesBySlug`, `_spotlightArticlesBySlug` | Add `persons` to tags (Issue B — embedded contributors).                                                                            |
| 4   | `lib/data/api-client.ts` `nationalConsortia.list`                               | Fix copy-paste bug: retag from `newsletters` to `nationalConsortia` (Issue C).                                                      |

## Out of scope

Multi-webhook fan-out (registry or message bus). The producer still posts to the single
`REVALIDATION_WEBHOOK_URL` / `REVALIDATION_WEBHOOK_SECRET`.
