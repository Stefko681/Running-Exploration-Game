-- CityQuest RLS Policies
-- Defines security rules for Profiles vs Leaderboard tables

-- ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- PROFILES
-- 1. Everyone can read profiles (needed for leaderboard display)
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING ( true );

-- 2. Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ( auth.uid() = id );

-- LEADERBOARD
-- 1. Everyone can read leaderboard
CREATE POLICY "Leaderboard is viewable by everyone" 
ON leaderboard FOR SELECT 
USING ( true );

-- 2. Users can insert their own score
CREATE POLICY "Users can upload own score" 
ON leaderboard FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- 3. Users can update their own score
CREATE POLICY "Users can update own score" 
ON leaderboard FOR UPDATE 
USING ( auth.uid() = user_id );
