ALTER TYPE public.incident_status ADD VALUE IF NOT EXISTS 'unverified';
ALTER TYPE public.incident_status ADD VALUE IF NOT EXISTS 'needs_evidence';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS ai_assessment jsonb;