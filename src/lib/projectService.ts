'use server'

import prisma from "./prisma";
import {
  Project,
  FilterType,
  PDFContent,
  ProjectWithShares,
  Template,
} from "@/types";

import { isCXOUser } from "@/lib/sharingService";
import { loadTemplateFromStorage } from "@/lib/templateService";
import { getAdminClient } from "@/lib/supabaseClient";
import {
  generateAndUploadThumbnail,
  deleteThumbnail,
} from "@/lib/thumbnailService";

const DEFAULT_CONTENT = `= Hello, world!`;
const PAGE_SIZE = 20;

export async function fetchUserProjects(
  page: number = 0,
  pageSize: number = PAGE_SIZE,
  filter: FilterType = "owned",
  userId: string
): Promise<{
  projects: ProjectWithShares[];
  hasMore: boolean;
  totalCount: number;
}> {
  let res: ProjectWithShares[];
  let totalCount: number;

  if(filter==='owned'){
    const r = await prisma.projects.findMany({
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include:{
        _count: true,
        project_shares: true,
        owner: true
      },
      where:{
        user_id: userId
      },
      orderBy:{
        updated_at: 'desc'
      }
    })
    res = r.map(p => ({
      ...p,
      project_type: p.project_type as "document" | "resume",
      template_id: p.template_id ? p.template_id : undefined,
      thumbnail_path: p.thumbnail_path ? p.thumbnail_path : undefined,
    }));
    totalCount = await prisma.projects.count({
      where:{
        user_id: userId
      }
    });
  } else if (filter === "shared") {
    const s = await prisma.projects.findMany({
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include:{
        _count: true,
        project_shares: true,
        owner: true
      },
      where:{
        project_shares:{
          some:{
            shared_with: userId
          }
        }
      },
      orderBy:{
        updated_at: 'desc'
      }
    })
    res = s.map(p => ({
      ...p,
      project_type: p.project_type as "document" | "resume",
      template_id: p.template_id ? p.template_id : undefined,
      thumbnail_path: p.thumbnail_path ? p.thumbnail_path : undefined,
    }));
    totalCount = await prisma.projects.count({
       where:{
        project_shares:{
          some:{
            shared_by: userId
          }
        }
      },
    })
  } else if (filter === "all") {
    const isCXO = await isCXOUser(userId);
    if (!isCXO) {
      throw new Error("Access denied: CXO privileges required");
    }
    const t = await prisma.projects.findMany({
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include:{
        _count: true,
        project_shares: true,
        owner: true
      },
      orderBy:{
        updated_at: 'desc'
      }
    })
    res = t.map(p => ({
      ...p,
      project_type: p.project_type as "document" | "resume",
      template_id: p.template_id ? p.template_id : undefined,
      thumbnail_path: p.thumbnail_path ? p.thumbnail_path : undefined,
    }));
    totalCount = await prisma.projects.count()
  } else{
    throw new Error("Invalid filter type");
  }

  return {
    projects: res,
    hasMore: (page + 1) * PAGE_SIZE < totalCount,
    totalCount,
  };
}

export async function searchUserProjects(
  searchQuery: string,
  page: number = 0,
  pageSize: number = PAGE_SIZE,
  filter: FilterType = "owned",
  userId: string
): Promise<{
  projects: ProjectWithShares[];
  hasMore: boolean;
  totalCount: number;
}> {

  let res: ProjectWithShares[];
  let totalCount: number;

  if(filter==='owned'){
    const r = await prisma.projects.findMany({
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include:{
        _count: true,
        project_shares: true,
        owner: true
      },
      where:{
        user_id: userId,
        title:{
          contains: searchQuery
        }
      },
      orderBy:{
        updated_at: 'desc'
      }
    })
    res = r.map(p => ({
      ...p,
      project_type: p.project_type as "document" | "resume",
      template_id: p.template_id ? p.template_id : undefined,
      thumbnail_path: p.thumbnail_path ? p.thumbnail_path : undefined,
    }));
    totalCount = await prisma.projects.count({
      where:{
        user_id: userId,
        title:{
          contains: searchQuery
        }
      }
    });
  } else if (filter === "shared") {
    const s = await prisma.projects.findMany({
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include:{
        _count: true,
        project_shares: true,
        owner: true
      },
      where:{
        project_shares:{
          some:{
            shared_with: userId
          }
        },
        title:{
          contains: searchQuery
        }
      },
      orderBy:{
        updated_at: 'desc'
      }
    })
    res = s.map(p => ({
      ...p,
      project_type: p.project_type as "document" | "resume",
      template_id: p.template_id ? p.template_id : undefined,
      thumbnail_path: p.thumbnail_path ? p.thumbnail_path : undefined,
    }));
    totalCount = await prisma.projects.count({
       where:{
        project_shares:{
          some:{
            shared_by: userId
          },
        },
        title:{
          contains: searchQuery
        }
      },
    })
  } else if (filter === "all") {
    const isCXO = await isCXOUser(userId);
    if (!isCXO) {
      throw new Error("Access denied: CXO privileges required");
    }
    const t = await prisma.projects.findMany({
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      include:{
        _count: true,
        project_shares: true,
        owner: true
      },
      orderBy:{
        updated_at: 'desc'
      },
      where:{
        title:{
          contains: searchQuery
        }
      }
    })
    res = t.map(p => ({
      ...p,
      project_type: p.project_type as "document" | "resume",
      template_id: p.template_id ? p.template_id : undefined,
      thumbnail_path: p.thumbnail_path ? p.thumbnail_path : undefined,
    }));
    totalCount = await prisma.projects.count()
  } else{
    throw new Error("Invalid filter type");
  }

  return {
    projects: res,
    hasMore: (page + 1) * PAGE_SIZE < totalCount,
    totalCount,
  };
}

export async function fetchUserProjectById(
  projectId: string
): Promise<Project | null> {
  try {
      const data = await prisma.projects.findUniqueOrThrow({
        where:{
          id: projectId
        }
      })
      return data as Project;
    } catch (error) {
      console.error(error);
      return null;
    }
}

export async function createProjectFromTemplate(
  userId: string,
  title: string,
  template: Template,
  projectType: "resume" | "document" = "document"
): Promise<Project> {
  const projectId = crypto.randomUUID();
  const typPath = `${userId}/${projectId}/main.typ`;
  const supabase = getAdminClient();

  const templateContent = await loadTemplateFromStorage(template.storage_path);

  const { error: uploadError } = await supabase.storage
    .from("user-projects")
    .upload(typPath, new Blob([templateContent], { type: "text/plain" }), {
      upsert: true,
      contentType: "text/plain",
    });

  if (uploadError) throw new Error(uploadError.message);

  const data = await prisma.projects.create({
    data:{
      id: projectId,
      user_id: userId,
      title,
      typ_path: typPath,
      template_id: template.id,
      project_type: projectType,
    }
  })
  return data as Project;
}

export async function createNewProject(
  userId: string,
  title: string = "Untitled Document"
): Promise<Project> {
  try {
    const projectId = crypto.randomUUID();
    const typPath = `${userId}/${projectId}/main.typ`;

    const supabase = getAdminClient();

    const data = await prisma.projects.create({
      data: {
        id: projectId,
        user_id: userId,
        title,
        typ_path: typPath
      }
    })

    // 2. Create initial file with default content
    const { error: fileError } = await supabase.storage
      .from("user-projects")
      .upload(typPath, new Blob([DEFAULT_CONTENT], { type: "text/plain" }), {
        contentType: "text/plain",
      });

    if (fileError) {
      // Clean up database entry if file creation fails
      await supabase.from("projects").delete().eq("id", projectId);
      throw new Error(`File creation failed: ${fileError.message}`);
    }

    return data as Project;
  } catch (error) {
    throw error;
  }
}

export async function saveProjectFile(
  projectId: string,
  typPath: string,
  code: string,
  pdfContent?: PDFContent
): Promise<Project | null> {
  try {
    const supabase = getAdminClient();

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("user-projects")
      .upload(typPath, new Blob([code], { type: "text/plain" }), {
        upsert: true,
        contentType: "text/plain",
      });

    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    // Generate and upload thumbnail if PDF content is provided
    if (pdfContent) {
      try {
        const thumbnailPath = `${typPath.replace(".typ", "_thumb.png")}`;
        const storedPathOrUrl = await generateAndUploadThumbnail(
          pdfContent,
          thumbnailPath
        );

        const data = await prisma.projects.update({
          where:{
            id: projectId
          },
          data:{
            thumbnail_path: storedPathOrUrl,
            updated_at: new Date().toISOString()
          }
        })   
        return data as Project; //&& data.length > 0 ? (data[0] as Project) : null;
      } catch (thumbnailError) {
        console.error("Thumbnail generation failed:", thumbnailError);
      }
    }
  } catch (error) {
    throw error;
  }
  return null;
}

export async function renameProject(
  projectId: string,
  newTitle: string
): Promise<Project> {
  try {
    const data= await prisma.projects.update({
      where:{
        id: projectId
      },
      data:{
        title: newTitle,
        updated_at: new Date().toISOString(),
      }
    })
    return data as Project;
  } catch (error) {
    throw error;
  }
}

export async function deleteProject(
  projectId: string,
  typPath: string,
  thumbnail_path?: string
): Promise<void> {
  try {
    const supabase = getAdminClient();

    const filesToDelete = [typPath];
    if (thumbnail_path && thumbnail_path.trim() !== "") {
      // Always delete from the thumbnails bucket using stored path
      await deleteThumbnail(thumbnail_path);
    }

    // Delete all files from storage in one call
    const { error: storageError } = await supabase.storage
      .from("user-projects")
      .remove(filesToDelete);

    if (storageError) {
      throw new Error("Storage files deletion failed");
    }

    // Delete database entry (this will cascade delete any related data)
    await prisma.projects.delete({
      where: {
        id: projectId
      }
    })
  } catch (error) {
    console.error("Project deletion failed:", error);
    throw error;
  }
}

export async function checkStorageAccess(): Promise<boolean> {
  try {
    const supabase = getAdminClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return false;
    }

    // Test if we can access files in the user-projects bucket
    const testPath = `${user.user.id}/test-${Date.now()}/connectivity-test.txt`;
    const testContent = "Storage connectivity test";

    const { error: uploadError } = await supabase.storage
      .from("user-projects")
      .upload(testPath, new Blob([testContent], { type: "text/plain" }));

    if (uploadError) {
      if (uploadError.message.includes("Bucket not found")) {
        return false;
      }

      if (
        uploadError.message.includes("permission") ||
        uploadError.message.includes("policy")
      ) {
        return true;
      }

      return false;
    }

    await supabase.storage.from("user-projects").remove([testPath]);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message && error.message.includes("Bucket not found")) {
        return false;
      }
    }
    return true;
  }
}