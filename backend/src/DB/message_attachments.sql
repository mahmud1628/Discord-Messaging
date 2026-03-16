CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),

  CONSTRAINT message_attachments_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES public.messages(id)
    ON DELETE CASCADE
);