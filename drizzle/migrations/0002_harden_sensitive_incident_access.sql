DROP POLICY IF EXISTS "Authorized users can view photo metadata" ON public.incident_photos;
CREATE POLICY "Report participants can view photo metadata"
ON public.incident_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.incidents i
    WHERE i.id = incident_photos.incident_id
      AND (
        i.reporter_id = auth.uid()
        OR public.has_role(auth.uid(), 'security_officer')
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'principal')
          AND i.institution_id IS NOT NULL
          AND public.same_institution(auth.uid(), i.institution_id)
        )
      )
  )
);

DROP POLICY IF EXISTS "Authorized users can view reviews" ON public.incident_reviews;
CREATE POLICY "Authorized reviewers can view review notes"
ON public.incident_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.incidents i
    WHERE i.id = incident_reviews.incident_id
      AND (
        public.has_role(auth.uid(), 'security_officer')
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'principal')
          AND i.institution_id IS NOT NULL
          AND public.same_institution(auth.uid(), i.institution_id)
        )
      )
  )
);

DROP POLICY IF EXISTS "Users view own evidence" ON storage.objects;
CREATE POLICY "Report participants view permitted evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'incident-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'security_officer')
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'principal')
      AND EXISTS (
        SELECT 1
        FROM public.incident_photos p
        JOIN public.incidents i ON i.id = p.incident_id
        WHERE p.storage_path = name
          AND i.institution_id IS NOT NULL
          AND public.same_institution(auth.uid(), i.institution_id)
      )
    )
  )
);

DROP POLICY IF EXISTS "Authorized reviewers can add reviews" ON public.incident_reviews;
CREATE POLICY "Authorized scoped reviewers can add reviews"
ON public.incident_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.incidents i
    WHERE i.id = incident_reviews.incident_id
      AND (
        public.has_role(auth.uid(), 'security_officer')
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'principal')
          AND i.institution_id IS NOT NULL
          AND public.same_institution(auth.uid(), i.institution_id)
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.same_institution(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id AND institution_id = _institution_id
    )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.same_institution(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.same_institution(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can bootstrap standard role" ON public.user_roles;
CREATE POLICY "Users can bootstrap only their standard role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'user');

CREATE POLICY "Administrators can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));