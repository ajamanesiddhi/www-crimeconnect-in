ALTER TYPE public.incident_status ADD VALUE IF NOT EXISTS 'verified' AFTER 'under_review';

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS security_review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

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

  INSERT INTO public.notifications (user_id, title, message, incident_id, kind)
  SELECT DISTINCT ur.user_id, 'New report for security review',
         NEW.report_id || ' — ' || NEW.incident_type || ' at ' || NEW.landmark, NEW.id, 'security_review'
  FROM public.user_roles ur
  WHERE ur.role = 'security_officer';
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_principals() FROM PUBLIC, anon, authenticated;