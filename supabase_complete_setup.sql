-- =====================================================
-- BD PROJECT MANAGEMENT - COMPLETE DATABASE SETUP
-- =====================================================
-- Jalankan SELURUH script ini di Supabase SQL Editor
-- (Dashboard Supabase → SQL Editor → New Query → Paste → Run)
-- =====================================================

-- =====================================================
-- BAGIAN 1: ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- =====================================================
-- BAGIAN 2: TABEL UTAMA
-- =====================================================

-- 2.1 Roles (Harus dibuat pertama karena direferensi oleh profiles)
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT 'bg-indigo-500',
    permissions JSONB DEFAULT '{
        "canManageTeam": false,
        "canManageProjects": false,
        "canManageTasks": false,
        "canManageRoles": false,
        "canDeleteTasks": false,
        "canDeleteProjects": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Profiles (User profiles, linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    username TEXT,
    role_id INTEGER REFERENCES public.roles(id) DEFAULT 2,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
    avatar TEXT,
    color TEXT DEFAULT 'bg-indigo-500',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    cover_image TEXT,
    interface_image TEXT,
    client TEXT,
    budget TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 Resources (Linked to projects)
CREATE TABLE IF NOT EXISTS public.resources (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT DEFAULT 'link',
    url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Sub-Projects
CREATE TABLE IF NOT EXISTS public.subprojects (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subproject_id INTEGER REFERENCES public.subprojects(id) ON DELETE CASCADE,
    start_date DATE,
    due_date DATE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- BAGIAN 3: DATA AWAL (Roles Default)
-- =====================================================
INSERT INTO public.roles (id, name, color, permissions) VALUES
    (1, 'Project Manager', 'bg-indigo-500', '{"canManageTeam": true, "canManageProjects": true, "canManageTasks": true, "canManageRoles": true, "canDeleteTasks": true, "canDeleteProjects": true}'),
    (2, 'Senior Developer', 'bg-blue-500', '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}'),
    (3, 'Frontend Dev', 'bg-pink-500', '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}'),
    (4, 'Backend Dev', 'bg-green-500', '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}'),
    (5, 'UI/UX Designer', 'bg-purple-500', '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual insert
SELECT setval('public.roles_id_seq', (SELECT MAX(id) FROM public.roles));

-- =====================================================
-- BAGIAN 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subprojects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 4.1 Profiles Policies
DROP POLICY IF EXISTS "Allow Read All Profiles" ON public.profiles;
CREATE POLICY "Allow Read All Profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow Insert Own Profile" ON public.profiles;
CREATE POLICY "Allow Insert Own Profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow Update All Profiles" ON public.profiles;
CREATE POLICY "Allow Update All Profiles" ON public.profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow Delete Profiles" ON public.profiles;
CREATE POLICY "Allow Delete Profiles" ON public.profiles
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4.2 Projects Policies (All authenticated users can CRUD)
DROP POLICY IF EXISTS "Allow All Projects" ON public.projects;
CREATE POLICY "Allow All Projects" ON public.projects
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4.3 Resources Policies
DROP POLICY IF EXISTS "Allow All Resources" ON public.resources;
CREATE POLICY "Allow All Resources" ON public.resources
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4.4 SubProjects Policies
DROP POLICY IF EXISTS "Allow All SubProjects" ON public.subprojects;
CREATE POLICY "Allow All SubProjects" ON public.subprojects
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4.5 Tasks Policies
DROP POLICY IF EXISTS "Allow All Tasks" ON public.tasks;
CREATE POLICY "Allow All Tasks" ON public.tasks
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4.6 Roles Policies (Read-only for all, can be managed via admin)
DROP POLICY IF EXISTS "Allow Read Roles" ON public.roles;
CREATE POLICY "Allow Read Roles" ON public.roles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow Manage Roles" ON public.roles;
CREATE POLICY "Allow Manage Roles" ON public.roles
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- BAGIAN 5: TRIGGER - AUTO CREATE PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, status, role_id, avatar, color)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'pending',
    2,
    null,
    'bg-indigo-500'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to ensure auth user is still created even if profile insert fails
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- BAGIAN 6: RPC FUNCTION - CREATE USER (Admin use)
-- =====================================================

DROP FUNCTION IF EXISTS public.create_user_command;

CREATE OR REPLACE FUNCTION public.create_user_command(
    email TEXT,
    password TEXT,
    name TEXT,
    role_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    -- WARNING: Creating users via SQL manually in Supabase often breaks GoTrue
    -- leading to 500 "Database error querying schema" on login due to missing 
    -- internal undocumented fields in auth.users or auth.identities.
    -- 
    -- It is HIGHLY RECOMMENDED to use supabase.auth.signUp() from the frontend 
    -- instead of this RPC.
    
    RAISE EXCEPTION 'Admin user creation via SQL is deprecated due to Supabase Auth restrictions. Please use the "Daftar" button on the login screen to create a user, then approve them in Settings.';
    
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_command TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_command TO service_role;

-- =====================================================
-- BAGIAN 7: STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "ProjectFiles Select Policy" ON storage.objects;
CREATE POLICY "ProjectFiles Select Policy"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-files' );

DROP POLICY IF EXISTS "ProjectFiles Insert Policy" ON storage.objects;
CREATE POLICY "ProjectFiles Insert Policy"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'project-files' );

DROP POLICY IF EXISTS "ProjectFiles Update Policy" ON storage.objects;
CREATE POLICY "ProjectFiles Update Policy"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'project-files' );

DROP POLICY IF EXISTS "ProjectFiles Delete Policy" ON storage.objects;
CREATE POLICY "ProjectFiles Delete Policy"
ON storage.objects FOR DELETE
USING ( bucket_id = 'project-files' );

-- =====================================================
-- SELESAI! Database siap digunakan.
-- =====================================================
-- Catatan:
-- - Login pertama bisa pakai admin@bd.com (Super Admin built-in di kode)
-- - User baru bisa sign up, status awal 'pending' (perlu approval admin)
-- - Atau admin bisa membuat user via Settings → Team Management
-- =====================================================
