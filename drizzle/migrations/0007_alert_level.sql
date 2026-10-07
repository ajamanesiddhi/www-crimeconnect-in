ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS alert_level text NOT NULL DEFAULT 'low' CHECK (alert_level IN ('high','medium','low'));

CREATE OR REPLACE FUNCTION public.notify_principals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE lvl text := upper(NEW.alert_level) || ' ALERT';
BEGIN
  INSERT INTO public.notifications (user_id, title, message, incident_id, kind)
  SELECT ur.user_id,
         '🚨 ' || lvl || ' — New Incident Reported',
         lvl || ': ' || NEW.description || ' at ' || COALESCE(NULLIF(NEW.address,''), NEW.landmark) || '. Report ID: ' || NEW.report_id || '. Open CrimeConnect to review.',
         NEW.id, 'incident_alert'
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'principal' AND NEW.institution_id IS NOT NULL AND p.institution_id = NEW.institution_id;

  INSERT INTO public.notifications (user_id, title, message, incident_id, kind)
  SELECT DISTINCT ur.user_id, '🚨 ' || lvl || ' — New report for security review',
         NEW.report_id || ' — ' || NEW.description || ' at ' || NEW.landmark, NEW.id, 'security_review'
  FROM public.user_roles ur
  WHERE ur.role = 'security_officer';
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_principals() FROM PUBLIC, anon, authenticated;