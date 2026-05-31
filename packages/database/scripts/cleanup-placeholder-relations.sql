-- One-off data cleanup to run BEFORE applying the document-level relation migrations against any
-- database imported from production (local/staging/prod). The UNR/WordPress importer recorded some
-- relations twice: once with an "unknown start" placeholder duration ([1900-01-01, ∞)) and once with
-- a real start date. After re-keying to document ids those two rows share the same (person, org, role)
-- with OVERLAPPING durations, which violates the new GiST exclusion constraint
-- `persons_to_organisational_units_person_org_role_no_overlap`.
--
-- This deletes ONLY a [1900-01-01, …) placeholder row that is superseded by a real-dated overlapping
-- row for the same (person document, org document, role). A lone placeholder with no real counterpart
-- is left untouched. Idempotent: a no-op once clean / on databases that never had the placeholders.
--
-- Assumes the table still has its original version-id columns (run before the migration re-keys it).
-- Run:  psql "$DATABASE_URL" -f packages/database/scripts/cleanup-placeholder-relations.sql

BEGIN;

DELETE FROM persons_to_organisational_units r
WHERE lower(r.duration) = DATE '1900-01-01'
  AND EXISTS (
    SELECT 1
    FROM persons_to_organisational_units s
    JOIN entity_versions rpev ON rpev.id = r.person_id
    JOIN entity_versions roev ON roev.id = r.organisational_unit_id
    JOIN entity_versions spev ON spev.id = s.person_id
    JOIN entity_versions soev ON soev.id = s.organisational_unit_id
    WHERE s.id <> r.id
      AND spev.entity_id = rpev.entity_id          -- same person document
      AND soev.entity_id = roev.entity_id          -- same organisational-unit document
      AND s.role_type_id = r.role_type_id
      AND s.duration && r.duration                 -- overlapping
      AND lower(s.duration) <> DATE '1900-01-01'   -- superseded by a real-dated row
  );

COMMIT;
