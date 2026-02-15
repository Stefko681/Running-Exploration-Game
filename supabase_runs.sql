-- CityQuest Runs Schema
-- Definition for run storage and history tracking

-- Create runs table for storing detailed run history
create table public.runs (
  id text primary key, -- client-generated ID (start-end timestamp)
  user_id uuid references auth.users not null,
  started_at bigint not null,
  ended_at bigint not null,
  distance_meters float not null,
  points jsonb not null, -- Array of {lat, lng, t}
  summary_data jsonb, -- Extra stats (pausedDuration, etc.)
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.runs enable row level security;

-- Policies
create policy "Users can insert their own runs"
on public.runs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own runs"
on public.runs for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own runs"
on public.runs for delete
to authenticated
using (auth.uid() = user_id);
