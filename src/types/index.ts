export type Project = {
  id: string;
  user_id: string;
  title: string;
  typ_path: string;
  project_type: "document" | "resume";
  template_id?: string;
  created_at: string;
  updated_at: string;
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
};
