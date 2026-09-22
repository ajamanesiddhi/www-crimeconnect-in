CREATE TYPE public.app_role AS ENUM ('user', 'security_officer', 'principal', 'admin');
CREATE TYPE public.incident_status AS ENUM ('submitted', 'under_review', 'referred', 'resolved');

CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 180),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 100),
  state text NOT NULL CHECK (char_length(state) BETWEEN 2 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view institutions" ON public.institutions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 100),
  avatar_url text,
  phone text CHECK (phone IS NULL OR char_length(phone) <= 24),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  authorized_area text CHECK (authorized_area IS NULL OR char_length(authorized_area) <= 160),
  notification_preferences jsonb NOT NULL DEFAULT '{"email":true,"status_updates":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.same_institution(_user_id uuid, _institution_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND institution_id = _institution_id)
$$;
GRANT EXECUTE ON FUNCTION public.same_institution(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL UNIQUE DEFAULT ('CC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  reporter_id uuid NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  incident_type text NOT NULL CHECK (char_length(incident_type) BETWEEN 2 AND 80),
  occurred_at timestamptz NOT NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  landmark text NOT NULL CHECK (char_length(landmark) BETWEEN 2 AND 240),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status public.incident_status NOT NULL DEFAULT 'submitted',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own incidents" ON public.incidents FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Authorized officers can view incidents" ON public.incidents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'security_officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Principals can view institution incidents" ON public.incidents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'principal') AND institution_id IS NOT NULL AND public.same_institution(auth.uid(), institution_id));
CREATE POLICY "Users can create own incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'submitted');
CREATE POLICY "Authorized reviewers can update incidents" ON public.incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'security_officer') OR public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'principal') AND institution_id IS NOT NULL AND public.same_institution(auth.uid(), institution_id)));

CREATE TABLE public.incident_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL,
  storage_path text NOT NULL CHECK (char_length(storage_path) BETWEEN 3 AND 500),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.incident_photos TO authenticated;
GRANT ALL ON public.incident_photos TO service_role;
ALTER TABLE public.incident_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized users can view photo metadata" ON public.incident_photos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id));
CREATE POLICY "Users can add photos to own incidents" ON public.incident_photos FOR INSERT TO authenticated WITH CHECK (uploader_id = auth.uid() AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.reporter_id = auth.uid()));

CREATE TABLE public.incident_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  previous_status public.incident_status,
  new_status public.incident_status NOT NULL,
  notes text NOT NULL CHECK (char_length(notes) BETWEEN 2 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.incident_reviews TO authenticated;
GRANT ALL ON public.incident_reviews TO service_role;
ALTER TABLE public.incident_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized users can view reviews" ON public.incident_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id));
CREATE POLICY "Authorized reviewers can add reviews" ON public.incident_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid() AND (public.has_role(auth.uid(), 'security_officer') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'admin')));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 2 AND 500),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX incidents_reporter_idx ON public.incidents(reporter_id, created_at DESC);
CREATE INDEX incidents_institution_idx ON public.incidents(institution_id, status);
CREATE INDEX reviews_incident_idx ON public.incident_reviews(incident_id, created_at DESC);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER incidents_set_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users upload evidence to own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'incident-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own evidence" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'incident-evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'security_officer') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users remove own evidence" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'incident-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);