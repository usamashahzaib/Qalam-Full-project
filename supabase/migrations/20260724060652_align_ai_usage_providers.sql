ALTER TABLE public.ai_usage
  DROP CONSTRAINT IF EXISTS ai_usage_provider_check;

ALTER TABLE public.ai_usage
  ADD CONSTRAINT ai_usage_provider_check
  CHECK (provider IN ('groq', 'gemini', 'mistral'));
