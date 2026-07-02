CREATE TABLE IF NOT EXISTS public.admin_permissions (
  admin_id        uuid        NOT NULL,
  reservations    text        CHECK (reservations    IN ('view', 'manage')),
  reviews         text        CHECK (reviews         IN ('view', 'moderate')),
  yel             text        CHECK (yel             IN ('view', 'adjust', 'bulk')),
  users           text        CHECK (users           IN ('view', 'edit')),
  venues          text        CHECK (venues          IN ('view', 'edit')),
  prizes          text        CHECK (prizes          IN ('view', 'manage')),
  concierge       text        CHECK (concierge       IN ('view', 'reply')),
  redemption      text        CHECK (redemption      IN ('view', 'redeem')),
  activity_log    text        CHECK (activity_log    IN ('view')),
  guides          text        CHECK (guides          IN ('view', 'manage')),
  menus           text        CHECK (menus           IN ('view', 'manage')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_permissions_pkey PRIMARY KEY (admin_id),
  CONSTRAINT admin_permissions_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_browser_access" ON public.admin_permissions FOR ALL TO authenticated USING (false);
