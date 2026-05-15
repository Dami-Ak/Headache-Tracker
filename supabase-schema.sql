-- Run this in your Supabase SQL editor.
-- If you already have the episodes table from v1, skip to the MIGRATION section at the bottom.

-- ── FRESH SETUP ─────────────────────────────────────────────────────────────

create table episodes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  time time not null,
  intensity text not null check (intensity in ('mild', 'moderate', 'severe')),
  medication_taken boolean not null,
  outcome text not null check (outcome in ('resolved', 'reduced', 'no_change', 'got_worse')),
  triggers text[] default '{}',
  notes text,
  created_at timestamptz default now()
);

alter table episodes enable row level security;

create policy "allow all" on episodes
  using (true)
  with check (true);


-- ── MIGRATION (existing table only) ─────────────────────────────────────────
-- If you already have the episodes table, run only these lines:

-- alter table episodes add column if not exists triggers text[] default '{}';
-- alter table episodes add column if not exists notes text;
-- alter table episodes add column if not exists user_id text not null default '';
