-- insert into users (username,email,password_hash)
-- values ('pritam','pritam@mail.com','hashedpassword');

-- insert into servers (name, owner_id)
-- select 'Test Server', id from users limit 1;

-- insert into channels (name, server_id)
-- select 'general', id from servers limit 1;

-- insert into messages (channel_id, author_id, content)
-- select
--   c.id,
--   u.id,
--   'Hello message'
-- from channels c, users u
-- limit 1;

-- create index idx_messages_channel_created
-- on messages(channel_id, created_at desc);

-- select *
-- from messages
-- order by created_at desc
-- limit 50;