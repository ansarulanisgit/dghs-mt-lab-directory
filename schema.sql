-- =========================================================================
-- DGHS EMPLOYEE DIRECTORY: MASTER UNIVERSAL DATABASE SCHEMA
-- =========================================================================

-- 1. Scraped Staff Records Table
CREATE TABLE IF NOT EXISTS public.staff_records (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    name TEXT,
    designation TEXT,
    status TEXT,
    discipline TEXT,
    designation_group TEXT,
    hris_id TEXT,
    contact_info TEXT,
    current_institute TEXT,
    prl_date DATE,
    nid TEXT,
    email TEXT,
    address TEXT,
    division TEXT,
    district TEXT,
    upazila TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Central Scraper & Sync Metadata (Universal Countdown Anchor)
CREATE TABLE IF NOT EXISTS public.scrape_metadata (
    id INT PRIMARY KEY DEFAULT 1,
    last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record_count INT DEFAULT 0,
    filled_count INT DEFAULT 0,
    vacant_count INT DEFAULT 0,
    abolished_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    schedule_interval_days INT DEFAULT 7,
    status TEXT DEFAULT 'idle',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize default metadata record if not exists
INSERT INTO public.scrape_metadata (id, last_run_at, record_count, filled_count, vacant_count, abolished_count, failed_count, schedule_interval_days, status)
VALUES (1, NOW(), 10027, 6516, 3259, 252, 0, 7, 'idle')
ON CONFLICT (id) DO NOTHING;

-- 3. Universal App Users (3-Tier Roles + Granular Permissions)
CREATE TABLE IF NOT EXISTS public.app_users (
    id INT PRIMARY KEY DEFAULT 1,
    users_list JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Central Dataset Backups (Up to 5 Versions)
CREATE TABLE IF NOT EXISTS public.staff_backups (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record_count INT NOT NULL DEFAULT 0,
    snapshot_data JSONB NOT NULL,
    is_auto BOOLEAN DEFAULT false
);

-- 5. System & Scraper Configuration (Super Admin Exclusive)
CREATE TABLE IF NOT EXISTS public.system_config (
    id INT PRIMARY KEY DEFAULT 1,
    config_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PDF Columns Customization & Drag-and-Drop Order
CREATE TABLE IF NOT EXISTS public.pdf_columns_config (
    id INT PRIMARY KEY DEFAULT 1,
    config_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- SECURITY & ROW LEVEL POLICIES
-- =========================================================================
ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_columns_config ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DROP POLICY IF EXISTS "Public Read staff_records" ON public.staff_records;
DROP POLICY IF EXISTS "Public Write staff_records" ON public.staff_records;
DROP POLICY IF EXISTS "Public Read scrape_metadata" ON public.scrape_metadata;
DROP POLICY IF EXISTS "Public Write scrape_metadata" ON public.scrape_metadata;
DROP POLICY IF EXISTS "Public Read app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public Write app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public Read staff_backups" ON public.staff_backups;
DROP POLICY IF EXISTS "Public Write staff_backups" ON public.staff_backups;
DROP POLICY IF EXISTS "Public Read system_config" ON public.system_config;
DROP POLICY IF EXISTS "Public Write system_config" ON public.system_config;
DROP POLICY IF EXISTS "Public Read pdf_columns_config" ON public.pdf_columns_config;
DROP POLICY IF EXISTS "Public Write pdf_columns_config" ON public.pdf_columns_config;

-- Public Read & Write Policies for Frontend App & Admin Operations
CREATE POLICY "Public Read staff_records" ON public.staff_records FOR SELECT USING (true);
CREATE POLICY "Public Write staff_records" ON public.staff_records FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read scrape_metadata" ON public.scrape_metadata FOR SELECT USING (true);
CREATE POLICY "Public Write scrape_metadata" ON public.scrape_metadata FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read app_users" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "Public Write app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read staff_backups" ON public.staff_backups FOR SELECT USING (true);
CREATE POLICY "Public Write staff_backups" ON public.staff_backups FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read system_config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Public Write system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read pdf_columns_config" ON public.pdf_columns_config FOR SELECT USING (true);
CREATE POLICY "Public Write pdf_columns_config" ON public.pdf_columns_config FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- REALTIME REPLICATION (Instant Multi-Device Synchronization)
-- =========================================================================
DO $DO_BLOCK$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'scrape_metadata') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.scrape_metadata;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_users') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_backups') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_backups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_config') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pdf_columns_config') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_columns_config;
    END IF;
END $DO_BLOCK$;
