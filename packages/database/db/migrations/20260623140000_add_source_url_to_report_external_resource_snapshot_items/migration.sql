-- Link to the resource's details page on the ingest source (e.g. its sshoc or zenodo page), split
-- out from the external links[]. Nullable; no backfill (refresh a snapshot to repopulate).

ALTER TABLE "report_external_resource_snapshot_items"
	ADD COLUMN IF NOT EXISTS "source_url" text;
