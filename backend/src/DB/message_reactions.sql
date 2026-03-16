CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT message_reactions_pkey PRIMARY KEY (id),

  CONSTRAINT message_reactions_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES public.messages(id)
    ON DELETE CASCADE,

  CONSTRAINT message_reactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_reaction UNIQUE (message_id, user_id, emoji)
);