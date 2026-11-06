CREATE TABLE public.staff_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_settings TO service_role;
ALTER TABLE public.staff_settings ENABLE ROW LEVEL SECURITY;