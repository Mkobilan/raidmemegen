-- Enable RLS (auth.users typically already has this, skipping to avoid permission errors)


-- 0. Cleanup (Optional: Safe to run since it's a new app)
drop table if exists public.room_messages;
drop table if exists public.rooms;

-- 1. Create Rooms Table
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references auth.users(id),
  game text not null,
  active_plan jsonb not null, -- Stores the full raid plan object
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true
);

-- Enable RLS on Rooms
alter table public.rooms enable row level security;

-- Policies for Rooms
-- Anyone can read rooms (needed to join via link)
create policy "Public rooms are viewable by everyone"
  on public.rooms for select
  using ( true );

-- Authenticated users can create rooms
create policy "Users can create rooms"
  on public.rooms for insert
  with check ( auth.uid() = host_id );

-- Host can update their room
-- Host can update their room (Updated to allow participants to sync state)
create policy "Authenticated users can update rooms"
  on public.rooms for update
  using ( auth.role() = 'authenticated' );

-- 2. Create Room Messages Table
create table public.room_messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id),
  username text not null,
  content text not null,
  type text default 'chat', -- 'chat', 'system', 'roll'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Messages
alter table public.room_messages enable row level security;

-- Policies for Messages
-- Anyone currently can read messages (if they have the room link/id, effectively)
create policy "Messages are viewable by everyone"
  on public.room_messages for select
  using ( true );

-- Authenticated users can insert messages
create policy "Users can insert messages"
  on public.room_messages for insert
  with check ( auth.uid() = user_id );

-- 3. Create Gallery Posts Table (For saving raids)
create table if not exists public.gallery_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  game text not null,
  raid text not null,
  squad_size int,
  vibe text,
  phases jsonb,
  title text,
  description text,
  upvotes int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.gallery_posts enable row level security;

create policy "Gallery posts are viewable by everyone"
  on public.gallery_posts for select
  using ( true );

create policy "Users can insert gallery posts"
  on public.gallery_posts for insert
  with check ( auth.uid() = user_id );

-- 4. Create Profiles Table (Simplified for Raid Stats)
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  username text,
  avatar_url text,
  raid_stats jsonb default '{"totalGenerated": 0, "totalSubmitted": 0, "totalUpvotes": 0}'::jsonb,
  updated_at timestamp with time zone
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Enable Realtime
-- Note: You usually must enable this in the Supabase Dashboard: Database -> Replication -> supabase_realtime
-- However, we can try to force it here (commands might fail if not superuser, but worth a try or just a comment)
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_messages;
