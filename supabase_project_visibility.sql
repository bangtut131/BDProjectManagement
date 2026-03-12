-- =====================================================
-- PERBAIKAN 1: UPDATE ROLE DEFAULT
-- =====================================================

-- 1. Hapus role default lama yang tidak relevan lagi (kecuali Project Manager)
-- Karena id sudah dipakai di profiles, kita update saja record yang ada
UPDATE public.roles SET name = 'AFA', color = 'bg-blue-500', permissions = '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}' WHERE id = 2;
UPDATE public.roles SET name = 'FO', color = 'bg-pink-500', permissions = '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}' WHERE id = 3;
UPDATE public.roles SET name = 'Intern', color = 'bg-green-500', permissions = '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}' WHERE id = 4;
UPDATE public.roles SET name = 'Staff Lain', color = 'bg-purple-500', permissions = '{"canManageTeam": false, "canManageProjects": false, "canManageTasks": true, "canManageRoles": false, "canDeleteTasks": false, "canDeleteProjects": false}' WHERE id = 5;

-- Pastikan id 1 tetap Project Manager
UPDATE public.roles SET name = 'Project Manager', color = 'bg-indigo-500', permissions = '{"canManageTeam": true, "canManageProjects": true, "canManageTasks": true, "canManageRoles": true, "canDeleteTasks": true, "canDeleteProjects": true}' WHERE id = 1;

-- =====================================================
-- PERBAIKAN 2: FITUR PROJECT VISIBILITY (Private Project)
-- =====================================================

-- 1. Tambahkan kolom is_private dan assignees ke tabel projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assignees UUID[] DEFAULT '{}';

-- 2. Update RLS Policy untuk projects agar memperhitungkan visibility
DROP POLICY IF EXISTS "Allow All Projects" ON public.projects;
DROP POLICY IF EXISTS "Project Visibility Policy" ON public.projects;

-- Policy Select: User bisa melihat project JIKA:
-- a. Dia bukan Project Manager (role_id != 1) TAPI project itu public (is_private = false)
-- b. Dia bukan Project Manager TAPI namanya ada di array assignees
-- c. Dia ADALAH Project Manager (role_id = 1) -> Bisa lihat semua
-- d. Dia pembuat project tersebut (created_by)
CREATE POLICY "Project Visibility Policy" ON public.projects
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    is_private = false 
    OR 
    auth.uid() = ANY(assignees)
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role_id = 1
    )
  )
);

-- Policy Insert: Semua authenticated bisa CREATE
CREATE POLICY "Allow Insert Projects" ON public.projects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy Update: Project Manager atau Assignees bisa UPDATE
CREATE POLICY "Allow Update Projects" ON public.projects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND (
    auth.uid() = ANY(assignees)
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role_id = 1
    )
  )
);

-- Policy Delete: Hanya Project Manager yg bisa DELETE
CREATE POLICY "Allow Delete Projects" ON public.projects
FOR DELETE USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role_id = 1
    )
  )
);
