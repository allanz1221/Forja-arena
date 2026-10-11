alter table forja_game.users add column if not exists mask text not null default 'none' check(mask in ('none','pumpkin'));
alter table forja_game.users add column if not exists hat text not null default 'none' check(hat in ('none','santa'));
