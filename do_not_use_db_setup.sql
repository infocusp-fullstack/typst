-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  typ_path TEXT NOT NULL,
  thumbnail_path TEXT,
  project_type TEXT NOT NULL DEFAULT 'document' CHECK (project_type IN ('document', 'resume')),
  template_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create cxo_users table for CXO management
CREATE TABLE cxo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'cxo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on cxo_users table
ALTER TABLE cxo_users ENABLE ROW LEVEL SECURITY;

-- Create project_shares table for document sharing
CREATE TABLE project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, shared_with)
);

-- Enable RLS on project_shares table
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX idx_project_shares_shared_with ON project_shares(shared_with);
CREATE INDEX idx_project_shares_shared_by ON project_shares(shared_by);
CREATE INDEX idx_cxo_users_email ON cxo_users(email);

-- RLS Policies for projects table

-- 1. Users can view their own projects
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (user_id = auth.uid());

-- 2. Users can view projects shared with them
CREATE POLICY "Users can view shared projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_shares ps 
      WHERE ps.project_id = projects.id 
      AND ps.shared_with = auth.uid()
    )
  );

-- 3. CXO users can view all projects (for "All resumes" view)
CREATE POLICY "CXO users can view all projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 4. Users can create their own projects
CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. Users can update their own projects
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (user_id = auth.uid());

-- 6. Users can update projects shared with them with edit permission
CREATE POLICY "Users can update shared projects with edit permission" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_shares ps 
      WHERE ps.project_id = projects.id 
      AND ps.shared_with = auth.uid()
      AND ps.permission = 'edit'
    )
  );

-- 7. CXO users can update any project
CREATE POLICY "CXO users can update any project" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 8. Users can delete their own projects
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- 9. CXO users can delete any project
CREATE POLICY "CXO users can delete any project" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for project_shares table

-- 1. Users can view shares they created (to see what they've shared)
CREATE POLICY "Users can view shares they created" ON project_shares
  FOR SELECT USING (shared_by = auth.uid());

-- 2. Users can view shares where they are the recipient (to see what's shared with them)
CREATE POLICY "Users can view shares where they are recipient" ON project_shares
  FOR SELECT USING (shared_with = auth.uid());

-- 3. Users can view shares for projects they own (to manage their shares)
CREATE POLICY "Users can view shares for projects they own" ON project_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_shares.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- 4. CXO users can view all shares (for "All resumes" view)
CREATE POLICY "CXO users can view all shares" ON project_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 5. Users can create shares for projects they own
CREATE POLICY "Users can create shares for projects they own" ON project_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_shares.project_id 
      AND p.user_id = auth.uid()
    )
    AND shared_by = auth.uid()
  );

-- 6. CXO users can create shares for any project
CREATE POLICY "CXO users can create shares for any project" ON project_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    AND shared_by = auth.uid()
  );

-- 7. Users can update shares they created (to change permissions)
CREATE POLICY "Users can update shares they created" ON project_shares
  FOR UPDATE USING (shared_by = auth.uid());

-- 8. Users can update shares for projects they own (alternative way to manage shares)
CREATE POLICY "Users can update shares for projects they own" ON project_shares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_shares.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- 9. CXO users can update any shares
CREATE POLICY "CXO users can update any shares" ON project_shares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 10. Users can delete shares they created (to unshare)
CREATE POLICY "Users can delete shares they created" ON project_shares
  FOR DELETE USING (shared_by = auth.uid());

-- 11. Users can delete shares for projects they own (alternative way to unshare)
CREATE POLICY "Users can delete shares for projects they own" ON project_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_shares.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- 12. Recipients can delete shares they received (to remove themselves from shared list)
CREATE POLICY "Recipients can delete shares they received" ON project_shares
  FOR DELETE USING (shared_with = auth.uid());

-- 13. CXO users can delete any shares
CREATE POLICY "CXO users can delete any shares" ON project_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for cxo_users table (only CXO users can manage CXO list)

-- 1. CXO users can view all CXO users
CREATE POLICY "CXO users can view all CXO users" ON cxo_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 2. CXO users can add new CXO users
CREATE POLICY "CXO users can add new CXO users" ON cxo_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 3. CXO users can update CXO users
CREATE POLICY "CXO users can update CXO users" ON cxo_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 4. CXO users can delete CXO users
CREATE POLICY "CXO users can delete CXO users" ON cxo_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-projects', 'user-projects', false);

-- Public thumbnails bucket for globally accessible images
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);

-- Storage policies for user's own files
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-projects' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for shared files (users can access files of projects shared with them)
CREATE POLICY "Users can view shared files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM project_shares ps 
      JOIN projects p ON ps.project_id = p.id 
      WHERE ps.shared_with = auth.uid() 
    )
  );

CREATE POLICY "Users can update shared files with edit permission" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM project_shares ps 
      JOIN projects p ON ps.project_id = p.id 
      WHERE ps.shared_with = auth.uid() 
      AND ps.permission = 'edit'
    )
  );

-- Additional policy for users to upload/insert shared files with edit permission
CREATE POLICY "Users can upload shared files with edit permission" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM project_shares ps 
      JOIN projects p ON ps.project_id = p.id 
      WHERE ps.shared_with = auth.uid() 
      AND ps.permission = 'edit'
    )
  );

-- Storage policies for CXO users (can access all files)
CREATE POLICY "CXO users can view all files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "CXO users can update all files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "CXO users can upload all files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "CXO users can delete all files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-projects' AND 
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Templates table for reusable document templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  storage_path TEXT NOT NULL,
  preview_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'resume',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Only CXO users can manage and view templates by default
CREATE POLICY "CXO can view templates" ON templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "CXO can manage templates" ON templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM cxo_users cu 
      WHERE cu.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Indexes for templates
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_category ON templates(category);