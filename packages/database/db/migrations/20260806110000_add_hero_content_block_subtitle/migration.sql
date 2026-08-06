-- A hero section needs a lede between its title and its calls to action. Without one the block
-- cannot express a landing screen, and the text has to be smuggled into a following rich-text block
-- which then renders below the buttons. Nullable: every existing hero predates the field.
ALTER TABLE "content_blocks_type_hero"
ADD COLUMN IF NOT EXISTS "subtitle" text;
