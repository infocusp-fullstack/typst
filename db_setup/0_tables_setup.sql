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

-- Indexes for Project_Shares
CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX idx_project_shares_shared_with ON project_shares(shared_with);
CREATE INDEX idx_project_shares_shared_by ON project_shares(shared_by);
CREATE INDEX idx_cxo_users_email ON cxo_users(email);


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

-- Indexes for templates
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_category ON templates(category);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-projects', 'user-projects', false);

-- Public thumbnails bucket for globally accessible images
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);