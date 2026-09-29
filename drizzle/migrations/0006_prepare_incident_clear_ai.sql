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
  NEW.ai_assessment := NULL;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.prepare_incident() FROM PUBLIC, anon, authenticated;