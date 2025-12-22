-- Migration to add settings columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_sub_id TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS default_meme_style TEXT DEFAULT 'Matrix';

-- Ensure RLS is enabled (should already be, but safe to include)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to update their own profile (if not already exists)
-- This might fail if the policy already exists, but "IF NOT EXISTS" isn't supported for policies in all Postgres versions.
-- We can drop and recreate if needed, but existing schema had it.
-- create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
