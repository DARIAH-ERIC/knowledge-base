-- Diagnose document-level relation rows that would violate the temporal exclusion constraints
-- (same logical relation, OVERLAPPING durations). Read-only. Safe to run any time.
--
-- Run against the database the migration failed on, e.g.:
--   psql "$DATABASE_URL" -f packages/database/scripts/diagnose-overlapping-relations.sql > overlaps.log
--
-- This assumes the relation tables still have their ORIGINAL version-id columns
-- (`person_id` / `organisational_unit_id`, `unit_id` / `related_unit_id`) — i.e. the failing
-- migration rolled back. It resolves each version id to its document id (entity_versions.entity_id),
-- then finds same-(document triple) rows whose durations overlap. Names come from each document's
-- published version, falling back to its draft.

\echo '############################################################'
\echo '## persons_to_organisational_units — overlapping conflicts ##'
\echo '############################################################'

WITH rel AS (
	SELECT
		puo.id,
		pev.entity_id AS person_doc,
		oev.entity_id AS org_doc,
		puo.role_type_id,
		puo.duration
	FROM persons_to_organisational_units puo
	JOIN entity_versions pev ON pev.id = puo.person_id
	JOIN entity_versions oev ON oev.id = puo.organisational_unit_id
),
person_name AS (
	SELECT dl.document_id, p.name
	FROM document_lifecycle dl
	JOIN persons p ON p.id = COALESCE(dl.published_id, dl.draft_id)
),
org_name AS (
	SELECT dl.document_id, ou.name
	FROM document_lifecycle dl
	JOIN organisational_units ou ON ou.id = COALESCE(dl.published_id, dl.draft_id)
)
SELECT
	pn.name AS person,
	onm.name AS organisational_unit,
	rt.type  AS role,
	a.duration AS duration_a,
	b.duration AS duration_b,
	a.person_doc,
	a.org_doc
FROM rel a
JOIN rel b
	ON b.id > a.id
	AND b.person_doc = a.person_doc
	AND b.org_doc = a.org_doc
	AND b.role_type_id = a.role_type_id
	AND b.duration && a.duration
JOIN person_role_types rt ON rt.id = a.role_type_id
LEFT JOIN person_name pn ON pn.document_id = a.person_doc
LEFT JOIN org_name onm ON onm.document_id = a.org_doc
ORDER BY person, organisational_unit, role;

\echo ''
\echo '-- summary: conflicting pairs, and how many involve the 1900-01-01 import placeholder --'
WITH rel AS (
	SELECT puo.id, pev.entity_id AS person_doc, oev.entity_id AS org_doc, puo.role_type_id, puo.duration
	FROM persons_to_organisational_units puo
	JOIN entity_versions pev ON pev.id = puo.person_id
	JOIN entity_versions oev ON oev.id = puo.organisational_unit_id
)
SELECT
	count(*) AS overlapping_pairs,
	count(*) FILTER (
		WHERE lower(a.duration) = DATE '1900-01-01' OR lower(b.duration) = DATE '1900-01-01'
	) AS pairs_involving_1900_placeholder
FROM rel a
JOIN rel b
	ON b.id > a.id
	AND b.person_doc = a.person_doc AND b.org_doc = a.org_doc
	AND b.role_type_id = a.role_type_id AND b.duration && a.duration;

\echo ''
\echo '############################################################'
\echo '## organisational_units_to_units — overlapping conflicts  ##'
\echo '############################################################'

WITH rel AS (
	SELECT
		r.id,
		uev.entity_id AS unit_doc,
		rev.entity_id AS related_doc,
		r.status,
		r.duration
	FROM organisational_units_to_units r
	JOIN entity_versions uev ON uev.id = r.unit_id
	JOIN entity_versions rev ON rev.id = r.related_unit_id
),
unit_name AS (
	SELECT dl.document_id, ou.name
	FROM document_lifecycle dl
	JOIN organisational_units ou ON ou.id = COALESCE(dl.published_id, dl.draft_id)
)
SELECT
	un.name  AS unit,
	rn.name  AS related_unit,
	st.status AS status,
	a.duration AS duration_a,
	b.duration AS duration_b,
	a.unit_doc,
	a.related_doc
FROM rel a
JOIN rel b
	ON b.id > a.id
	AND b.unit_doc = a.unit_doc
	AND b.related_doc = a.related_doc
	AND b.status = a.status
	AND b.duration && a.duration
JOIN organisational_unit_status st ON st.id = a.status
LEFT JOIN unit_name un ON un.document_id = a.unit_doc
LEFT JOIN unit_name rn ON rn.document_id = a.related_doc
ORDER BY unit, related_unit, status;

\echo ''
\echo '-- summary --'
WITH rel AS (
	SELECT r.id, uev.entity_id AS unit_doc, rev.entity_id AS related_doc, r.status, r.duration
	FROM organisational_units_to_units r
	JOIN entity_versions uev ON uev.id = r.unit_id
	JOIN entity_versions rev ON rev.id = r.related_unit_id
)
SELECT
	count(*) AS overlapping_pairs,
	count(*) FILTER (
		WHERE lower(a.duration) = DATE '1900-01-01' OR lower(b.duration) = DATE '1900-01-01'
	) AS pairs_involving_1900_placeholder
FROM rel a
JOIN rel b
	ON b.id > a.id
	AND b.unit_doc = a.unit_doc AND b.related_doc = a.related_doc
	AND b.status = a.status AND b.duration && a.duration;
