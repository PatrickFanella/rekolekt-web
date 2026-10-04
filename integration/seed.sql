-- One completed episode with a short speaker-labelled transcript.
INSERT INTO jobs (id, kind, state, input_url)
VALUES ('00000000-0000-0000-0000-000000000101', 'single', 'completed', 'https://www.youtube.com/watch?v=itSeed00001');

INSERT INTO videos (id, job_id, youtube_id, idx, title, duration_seconds, state, uploaded_at, channel_name)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'itSeed00001',
  0,
  'Seeded integration episode',
  120,
  'completed',
  '2026-06-15T12:00:00Z',
  'Integration channel'
);

INSERT INTO transcripts (id, video_id, model, language)
VALUES ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'integration', 'en');

INSERT INTO segments (transcript_id, idx, start_ms, end_ms, text, speaker_label)
VALUES
  ('00000000-0000-0000-0000-000000000301', 0, 0, 4000, 'Welcome to the seeded archive episode.', 'Host'),
  ('00000000-0000-0000-0000-000000000301', 1, 5000, 9000, 'Housing costs and rent control came up today.', 'Host'),
  ('00000000-0000-0000-0000-000000000301', 2, 10000, 14000, 'Rent control is a policy question.', 'Guest'),
  ('00000000-0000-0000-0000-000000000301', 3, 15000, 19000, 'Thanks for listening to the archive.', 'Host');
