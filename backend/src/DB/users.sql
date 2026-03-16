create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);