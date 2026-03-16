create table channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid references servers(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);