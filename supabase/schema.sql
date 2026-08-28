-- DGHS MT-Lab Directory Database Schema
-- Supabase (PostgreSQL)

create table if not exists mt_lab_staff (
  id uuid primary key default gen_random_uuid(),
  hris_id text unique not null,
  provider_id text,
  name text not null,
  contact_info text,
  dob date,
  gender text,
  post_id text,
  designation text,
  current_institute text,
  division text,
  district text,
  upazila text,
  prl_date date,
  last_scraped_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Search and Filter Indexes
create index if not exists idx_mt_lab_staff_division on mt_lab_staff(division);
create index if not exists idx_mt_lab_staff_district on mt_lab_staff(district);
create index if not exists idx_mt_lab_staff_upazila on mt_lab_staff(upazila);
create index if not exists idx_mt_lab_staff_gender on mt_lab_staff(gender);
create index if not exists idx_mt_lab_staff_post_id on mt_lab_staff(post_id);
create index if not exists idx_mt_lab_staff_prl_date on mt_lab_staff(prl_date);
create index if not exists idx_mt_lab_staff_name on mt_lab_staff using gin (to_tsvector('english', name));

-- Metadata table for sync timestamps & stats
create table if not exists scrape_metadata (
  id int primary key default 1,
  last_run_at timestamptz,
  record_count int,
  failed_count int,
  constraint single_row check (id = 1)
);

-- Enable Row Level Security (RLS)
alter table mt_lab_staff enable row level security;
create policy "Public read access" on mt_lab_staff
  for select using (true);

alter table scrape_metadata enable row level security;
create policy "Public read access metadata" on scrape_metadata
  for select using (true);