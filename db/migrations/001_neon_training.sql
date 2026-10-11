-- Persistencia de entrenamiento por sesión anónima; aislada de tablas futuras.
create schema if not exists forja_training;
create table if not exists forja_training.sessions (
 token_hash text primary key check(length(token_hash)=64),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days',
 writes integer not null default 0,
 write_window timestamptz not null default now()
);
create table if not exists forja_training.saves (
 token_hash text primary key references forja_training.sessions(token_hash) on delete cascade,
 profile jsonb not null check(jsonb_typeof(profile)='object'),
 updated_at timestamptz not null default now()
);
alter table forja_training.sessions enable row level security;
alter table forja_training.saves enable row level security;
revoke all on schema forja_training from public;
revoke all on all tables in schema forja_training from public;
create index if not exists forja_sessions_expiry on forja_training.sessions(expires_at);
