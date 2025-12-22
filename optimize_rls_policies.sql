-- RLS Performance Optimization Migration
-- This script addresses "auth_rls_initplan" and "multiple_permissive_policies" warnings.

BEGIN;

-- ==========================================
-- 1. Profiles Table Optimization
-- ==========================================

-- Drop redundant or suboptimal policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- Create optimized policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = id );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( (SELECT auth.uid()) = id );


-- ==========================================
-- 2. Gallery Posts Table Optimization
-- ==========================================

-- Drop redundant or suboptimal policies
DROP POLICY IF EXISTS "Gallery is viewable by everyone." ON public.gallery_posts;
DROP POLICY IF EXISTS "Gallery posts are viewable by everyone" ON public.gallery_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts." ON public.gallery_posts;
DROP POLICY IF EXISTS "Users can insert gallery posts" ON public.gallery_posts;
DROP POLICY IF EXISTS "Users can update own posts." ON public.gallery_posts;
DROP POLICY IF EXISTS "Users can delete own posts." ON public.gallery_posts;

-- Create optimized policies
CREATE POLICY "Gallery posts are viewable by everyone"
  ON public.gallery_posts FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert gallery posts"
  ON public.gallery_posts FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can update own posts"
  ON public.gallery_posts FOR UPDATE
  USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can delete own posts"
  ON public.gallery_posts FOR DELETE
  USING ( (SELECT auth.uid()) = user_id );


-- ==========================================
-- 3. Votes Table Optimization (Implicit from warnings)
-- ==========================================

-- Drop suboptimal policies
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
DROP POLICY IF EXISTS "Users can update their own vote" ON public.votes;
DROP POLICY IF EXISTS "Users can delete their own vote" ON public.votes;

-- Create optimized policies
CREATE POLICY "Authenticated users can vote"
  ON public.votes FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can update their own vote"
  ON public.votes FOR UPDATE
  USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can delete their own vote"
  ON public.votes FOR DELETE
  USING ( (SELECT auth.uid()) = user_id );


-- ==========================================
-- 4. Saved Raids Table Optimization (Implicit from warnings)
-- ==========================================

-- Drop suboptimal policies
DROP POLICY IF EXISTS "Users can view own saved raids" ON public.saved_raids;
DROP POLICY IF EXISTS "Users can create saved raids" ON public.saved_raids;
DROP POLICY IF EXISTS "Users can delete own saved raids" ON public.saved_raids;

-- Create optimized policies
CREATE POLICY "Users can view own saved raids"
  ON public.saved_raids FOR SELECT
  USING ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can create saved raids"
  ON public.saved_raids FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "Users can delete own saved raids"
  ON public.saved_raids FOR DELETE
  USING ( (SELECT auth.uid()) = user_id );


-- ==========================================
-- 5. Rooms Table Optimization
-- ==========================================

-- Drop suboptimal policies
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON public.rooms;

-- Create optimized policies
CREATE POLICY "Users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = host_id );

CREATE POLICY "Authenticated users can update rooms"
  ON public.rooms FOR UPDATE
  USING ( (SELECT auth.role()) = 'authenticated' );


-- ==========================================
-- 6. Room Messages Table Optimization
-- ==========================================

-- Drop suboptimal policies
DROP POLICY IF EXISTS "Users can insert messages" ON public.room_messages;

-- Create optimized policies
CREATE POLICY "Users can insert messages"
  ON public.room_messages FOR INSERT
  WITH CHECK ( (SELECT auth.uid()) = user_id );

COMMIT;
