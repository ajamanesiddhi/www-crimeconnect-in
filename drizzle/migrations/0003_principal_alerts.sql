ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS reporter_role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'info';

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push tokens select" ON public.push_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Principals register own push tokens" ON public.push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(),'principal'));
CREATE POLICY "Users delete own push tokens" ON public.push_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prepare_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF NEW.institution_id IS NULL THEN
    SELECT id INTO NEW.institution_id FROM public.institutions WHERE name ILIKE 'D. Y. Patil%' ORDER BY created_at LIMIT 1;
  END IF;
  NEW.reporter_role := COALESCE((SELECT role::text FROM public.user_roles WHERE user_id = NEW.reporter_id
     ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'principal' THEN 2 WHEN 'security_officer' THEN 3 ELSE 4 END LIMIT 1), 'user');
  NEW.acknowledged_at := NULL;
  NEW.acknowledged_by := NULL;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_principals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, incident_id, kind)
  SELECT ur.user_id,
         '🚨 CRIME ALERT — New Incident Reported',
         'New incident reported at ' || COALESCE(NULLIF(NEW.address,''), NEW.landmark) || '. Report ID: ' || NEW.report_id || '. Open CrimeConnect to review.',
         NEW.id, 'incident_alert'
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'principal' AND NEW.institution_id IS NOT NULL AND p.institution_id = NEW.institution_id;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.prepare_incident() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_principals() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER incidents_prepare BEFORE INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.prepare_incident();
CREATE TRIGGER incidents_notify_principals AFTER INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.notify_principals();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;