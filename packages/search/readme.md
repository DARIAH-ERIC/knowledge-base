# @dariah-eric/search

## collection aliases

The configured collection names (`TYPESENSE_RESOURCE_COLLECTION_NAME`,
`TYPESENSE_WEBSITE_COLLECTION_NAME`) are **aliases**. Each points at a versioned collection named
`<alias>_<timestamp>`, and everything — search, document writes, the search api key — goes through
the alias.

- **resources** is rebuilt on every sync: a new collection is filled from scratch and the alias is
  swapped to it at once. That drops stale documents and applies schema changes, with no window where
  search sees an empty or half-built index. A rebuild holding less than half the documents of the
  current one is refused, since that more likely means an upstream api returned too little.
- **website** is updated in place, because the dashboard writes to it on every publish and those
  writes would be lost if a rebuild were swapped in underneath them. `search:collections:reset`
  swaps in an empty collection with the current schema, which then needs a full ingest.

Each swap keeps the collection the alias pointed at before and drops older versions. To roll back,
point the alias at the previous collection again:

```sh
curl -X PUT "$TYPESENSE_URL/aliases/<alias>" \
  -H "X-TYPESENSE-API-KEY: $TYPESENSE_ADMIN_API_KEY" \
  -d '{"collection_name": "<alias>_<previous timestamp>"}'
```

A collection created before collections were aliased is replaced by the first swap. An alias cannot
share its name with a collection, so that collection is deleted right before the alias takes its
name, and there is no previous version to roll back to that one time.
