alter table forja_game.matches add column if not exists recording jsonb;
alter table forja_game.matches add column if not exists recording_version text;
