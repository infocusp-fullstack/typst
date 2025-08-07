export type Project = {
  id: string;
  user_id: string;
  title: string;
  typ_path: string;
  project_type: "document" | "resume";
  template_id?: string;
  created_at: string;
  updated_at: string;
  thumbnail_path?: string;

};
export type Template = {
  id: string;
  title: string;
  description: string | null;
  content?: string;
  storage_path: string;
  preview_image_url: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_path?: string;
};

export type ProjectShare = {
  id: string;
  project_id: string;
  shared_by: string;
  shared_with: string;
  permission: "read" | "edit";
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  created_at: string;
};

export type  ProjectWithShares = Project & {
  project_shares?: [{ shared_with: string }];
  shares?: ProjectShare[];
  owner?: User;
  shared_by?: User;
};

export type SharePermission = "read" | "edit";

export type FilterType = "owned" | "shared" | "all";

// Type for PDF content
export type PDFContent = Uint8Array;
