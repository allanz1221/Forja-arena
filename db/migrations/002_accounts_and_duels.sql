create schema if not exists forja_game;
create table if not exists forja_game.users (
 id uuid primary key default gen_random_uuid(),
 username text not null unique check(username=lower(username) and length(username) between 3 and 24),
 password_hash text not null,
 archetype text not null default 'balanced' check(archetype in ('balanced','heavy','quick')),
 xp integer not null default 0,
 wins integer not null default 0,
 matches integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists forja_game.sessions (
 token_hash text primary key,
 user_id uuid not null references forja_game.users(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '30 days'
);
create table if not exists forja_game.daily_usage (
 user_id uuid not null references forja_game.users(id) on delete cascade,
 day date not null,
 used integer not null check(used between 0 and 10),
 primary key(user_id,day)
);
create table if not exists forja_game.matches (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references forja_game.users(id) on delete cascade,
 opponent_id uuid references forja_game.users(id) on delete set null,
 snapshot jsonb not null,
 rules_version text not null default '0.2',
 status text not null default 'started' check(status in ('started','finished')),
 result text check(result in ('player','enemy','draw')),
 actions jsonb,
 duration numeric,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '15 minutes'
);
create index if not exists forja_match_history on forja_game.matches(user_id,created_at desc);
-- Cuotas de autenticación por IP hash en ventana de diez minutos.
create table if not exists forja_game.auth_limits (
 key text primary key,attempts integer not null,window_start timestamptz not null default now()
);
alter table forja_game.users enable row level security;
alter table forja_game.sessions enable row level security;
alter table forja_game.daily_usage enable row level security;
alter table forja_game.matches enable row level security;
alter table forja_game.auth_limits enable row level security;
revoke all on schema forja_game from public;
revoke all on all tables in schema forja_game from public;
