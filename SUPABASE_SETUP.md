# ⚡ Supabase Setup Guide for CityQuest

This guide will help you set up the backend database for your game. Don't worry, it's free and takes about 5 minutes.

## Step 1: Create Account & Project
1.  Go to **[supabase.com](https://supabase.com)** and click "Start your project".
2.  Sign in with GitHub (easiest) or email.
3.  Click **"New Project"**.
4.  Choose your organization (it will create one for you if needed).
5.  **Name**: `CityQuest`
6.  **Database Password**: Create a strong password (save it somewhere, though we won't need it right now).
7.  **Region**: Choose one close to you (e.g., "West Europe" or "East US").
8.  Click **"Create new project"**.
9.  Wait about 1-2 minutes for the "Setting up..." bar to finish.

## Step 2: Get Your Keys (Connect the App)
1.  Once the project is ready, look at the left sidebar.
2.  Click on the **Settings icon (cogwheel)** at the bottom.
3.  Click on **"API"**.
4.  Look for the section **"Project URL"**. Copy that URL.
5.  Look for the section **"Project API keys"** -> **"anon"** -> **"public"**. Copy that long string.

## Step 3: Put Keys in Your Code
1.  Go back to your code editor (VS Code / IDX).
2.  Open the file named `.env.local` (I created it for you in the main folder).
3.  Paste your URL after `VITE_SUPABASE_URL=`.
4.  Paste your `anon` key after `VITE_SUPABASE_ANON_KEY=`.
5.  Save the file.

## Step 4: Create the Tables (The Database Structure)
1.  Go back to your Supabase dashboard.
2.  Click on the **"SQL Editor"** icon in the left sidebar (looks like a terminal `>_`).
3.  Click **"New Query"** (a blank page).
4.  Copy/Paste the **entire code block below** into that box:

```sql
-- 1. Create Profiles Table (Stores user info)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  username TEXT NOT NULL,
  avatar_seed TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Leaderboard Table (Stores scores)
CREATE TABLE public.leaderboard (
  user_id UUID REFERENCES public.profiles(id) NOT NULL PRIMARY KEY,
  league TEXT NOT NULL DEFAULT 'Bronze',
  score INTEGER NOT NULL DEFAULT 0,
  distance REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Security Rules (Allow everyone to play)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can register" ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Public leaderboard is viewable by everyone" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can upload scores" ON public.leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scores" ON public.leaderboard FOR UPDATE USING (true);
```

5.  Click the **"Run"** button (bottom right of the text box).
6.  You should see "Success" in the results area.

## Step 5: Restart & Play
1.  Go to your terminal where the app is running.
2.  Press `Ctrl + C` to stop it.
3.  Run `npm run dev` again to restart.
4.  Open the app, go to **Rankings**, and you should see yourself on the Global Leaderboard!
