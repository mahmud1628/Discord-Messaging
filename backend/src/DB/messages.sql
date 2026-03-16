create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  author_id uuid references users(id),
  content text,
  created_at timestamptz default now(),
  edited_at timestamptz
);