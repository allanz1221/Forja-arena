create table if not exists forja_game.bot_settings (id boolean primary key default true check(id), settings jsonb not null, revision integer not null default 1, updated_at timestamptz not null default now());
create table if not exists forja_game.admin_sessions (token_hash text primary key, expires_at timestamptz not null default now()+interval '8 hours');
alter table forja_game.bot_settings enable row level security;
alter table forja_game.admin_sessions enable row level security;
revoke all on forja_game.bot_settings,forja_game.admin_sessions from public;
