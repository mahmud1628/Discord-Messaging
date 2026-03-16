CREATE TABLE public.pinned_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL UNIQUE,
  channel_id uuid NOT NULL,
  pinned_by uuid,
  pinned_at timestamp with time zone DEFAULT now(),

  CONSTRAINT pinned_messages_pkey PRIMARY KEY (id),

  CONSTRAINT pinned_messages_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES public.messages(id)
    ON DELETE CASCADE,

  CONSTRAINT pinned_messages_channel_id_fkey
    FOREIGN KEY (channel_id) REFERENCES public.channels(id)
    ON DELETE CASCADE,

  CONSTRAINT pinned_messages_user_id_fkey
    FOREIGN KEY (pinned_by) REFERENCES public.users(id)
);