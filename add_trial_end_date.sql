-- Migration to add trial_end_date to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Initialize existing users who don't have a trial end date
-- Setting it to 14 days from their creation date
UPDATE public.profiles
SET trial_end_date = created_at + INTERVAL '14 days'
WHERE trial_end_date IS NULL;
