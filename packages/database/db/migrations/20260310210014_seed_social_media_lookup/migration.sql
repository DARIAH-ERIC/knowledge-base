INSERT INTO
	"social_media_types" ("type")
VALUES
	('bluesky'),
	('facebook'),
	('instagram'),
	('linkedin'),
	('mastodon'),
	('twitter'),
	('vimeo'),
	('website'),
	('youtube')
ON CONFLICT ("type") DO NOTHING;
