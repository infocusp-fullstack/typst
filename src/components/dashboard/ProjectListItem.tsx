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
  Edit,
  Share2,
  Users,
} from "lucide-react";
import { ProjectWithShares } from "@/types";
import React, { useState, useEffect } from "react";
import { getThumbnailUrl } from "@/lib/thumbnailService";
import { User } from "@supabase/supabase-js";

interface ProjectListItemProps {
  project: ProjectWithShares;
  onOpen: () => void;
  onDelete: () => void;
  isNavigating?: boolean;
  currentUser: User;
  isCXO: boolean;
  onRename: () => void;
}

const ProjectListItem = React.memo(
  ({
    project,
    onOpen,
    onDelete,
    isNavigating = false,
    currentUser,
    isCXO,
    onRename,
  }: ProjectListItemProps) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [canRename, setCanRename] = useState(false);

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
    }, [project.id, currentUser.id, isOwner]);

    // Load thumbnail if available
    useEffect(() => {
      if (project.thumbnail_path) {
        setIsLoadingThumbnail(true);
        getThumbnailUrl(project.thumbnail_path)
          .then((url) => {
            setThumbnailUrl(url);
          })
          .catch((error) => {
            console.error("Failed to load thumbnail:", error);
          })
          .finally(() => {
            setIsLoadingThumbnail(false);
          });
      } else {
        setThumbnailUrl(null);
      }
    }, [project.thumbnail_path]);

    return (
      <div
        className="group flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer relative"
        onClick={onOpen}
      >
        {isNavigating && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        <div className="flex-shrink-0">
          {thumbnailUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden border">
              <img
                src={thumbnailUrl}
                alt={`Preview of ${project.title}`}
                className="w-full h-full object-cover"
                onError={() => setThumbnailUrl(null)}
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {isLoadingThumbnail ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate text-sm mb-1">{project.title}</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Last Modified {formatDate(project.updated_at)}</span>
            <div className="flex items-center gap-1">
              {isOwner ? (
                <Users className="h-3 w-3" />
              ) : (
                <Share2 className="h-3 w-3" />
              )}
              <span>{isOwner ? "Owned" : "Shared"}</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full cursor-pointer">
                <MoreVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
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
    );
  },
);

ProjectListItem.displayName = "ProjectListItem";
export { ProjectListItem };
