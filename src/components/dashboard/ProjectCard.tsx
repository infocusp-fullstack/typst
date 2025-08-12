import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit3,
  FileText,
  MoreVertical,
  Trash2,
  Users,
  Edit,
  Share2,
} from "lucide-react";
import { ProjectWithShares } from "@/types";
import React, { useState, useEffect } from "react";
import { getThumbnailUrl } from "@/lib/thumbnailService";
import { User } from "@supabase/supabase-js";

interface ProjectCardProps {
  project: ProjectWithShares;
  onOpen: () => void;
  onDelete: () => void;
  isNavigating?: boolean;
  currentUser: User;
  isCXO: boolean;
  onRename: () => void;
}

const ProjectCard = React.memo(
  ({
    project,
    onOpen,
    onDelete,
    isNavigating = false,
    currentUser,
    isCXO,
    onRename,
  }: ProjectCardProps) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [canDelete, setCanDelete] = useState(false);
    const [canRename, setCanRename] = useState(false);

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const isOwner = project.user_id === currentUser.id;
    const isSharedWith =
      project.project_shares?.some((t) => currentUser.id === t.shared_with) ??
      false;

    // Check permissions
    useEffect(() => {
      setCanDelete(isCXO || isOwner);
      setCanRename(isCXO || isOwner || isSharedWith);
      const url = project.thumbnail_path
        ? `${getThumbnailUrl(project.thumbnail_path)}?v=${project.updated_at}`
        : null;
      setThumbnailUrl(url);
    }, [project.id, currentUser.id, isOwner]);

    return (
      <div className="group relative cursor-pointer" onClick={onOpen}>
        <div className="relative w-full aspect-[210/297] bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background">
            {thumbnailUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={thumbnailUrl}
                  alt={`Preview of ${project.title}`}
                  className="w-full h-full object-cover"
                  onError={() => setThumbnailUrl(null)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-2/3">
                <FileText className="h-16 w-16 text-primary/30" />
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-card border-t border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium truncate hover:text-primary transition-colors">
                  {project.title}
                </h3>
                {project.project_type === "resume" && (
                  <span className="min-w-0 flex-shrink-0 px-1.5 py-0.5 text-[0.625em] font-medium rounded bg-primary/10 text-primary border border-primary/20">
                    Resume
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {isOwner ? (
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(project.updated_at)}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="hover:bg-muted w-6 h-6 flex items-center justify-center rounded cursor-pointer">
                          <MoreVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen();
                          }}
                          className="cursor-pointer"
                        >
                          <Edit3 className="mr-2 h-4 w-4" />
                          Open
                        </DropdownMenuItem>
                        {canRename && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onRename();
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            {canRename && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                              }}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isNavigating && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProjectCard.displayName = "ProjectCard";
export { ProjectCard };
