ALTER TABLE "content_blocks_type_callout"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_callout_intent_enum_check";

--> statement-breakpoint

UPDATE "content_blocks_type_callout"
SET "intent" = 'neutral'
WHERE "intent" = 'default';

--> statement-breakpoint

ALTER TABLE "content_blocks_type_callout"
	ADD CONSTRAINT "content_blocks_type_callout_intent_enum_check"
	CHECK ("intent" IN ('neutral', 'info', 'warning', 'danger', 'success'));
