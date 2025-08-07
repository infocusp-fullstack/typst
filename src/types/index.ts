export type Project = {
  id: string;
  user_id: string;
  title: string;
  typ_path: string;
  thumbnail_path?: string;
  created_at: string; // ISO timestamp string
  updated_at: string; // ISO timestamp string
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

export type ProjectWithShares = Project & {
  project_shares?: [{ shared_with: string }];
  shares?: ProjectShare[];
  owner?: User;
  shared_by?: User;
};

export type SharePermission = "read" | "edit";

export type FilterType = "owned" | "shared" | "all";

// Type for PDF content
export type PDFContent = Uint8Array;
