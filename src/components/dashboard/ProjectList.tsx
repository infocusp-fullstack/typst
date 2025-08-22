import React, { useMemo } from "react";
import Link from "next/link";
import { ProjectWithShares as Project } from "@/types";
import { User } from "@supabase/supabase-js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit3,
  Edit,
  FileText,
  MoreVertical,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { ShareModal } from "@/components/editor/ShareModal";
import { getThumbnailUrl } from "@/lib/thumbnailService";
import { TruncateWithTooltip } from "@/components/ui/TruncateWithTooltip";
import { useState } from "react";

interface ProjectListProps {
  projects: Project[];
  // onOpenProject: (projectId: string) => void;
  onDeleteProject: (
    projectId: string,
    typPath: string,
    thumbnail_path?: string,
  ) => void;
  currentUser: User;
  isCXO: boolean;
  onRenameRequest: (projectId: string, currentTitle: string) => void;
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ProjectList = React.memo(
  ({
    projects,
    // onOpenProject,
    onDeleteProject,
    currentUser,
    isCXO,
    onRenameRequest,
  }: ProjectListProps) => {
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
      null,
    );

    const rows = useMemo(() => {
      return projects.map((project) => {
        const isOwner = project.user_id === currentUser.id;
        const isSharedWith = project.project_shares?.some(
          (t) => currentUser.id === t.shared_with,
        );
        const canDelete = isCXO || isOwner;
        const canRename = isCXO || isOwner || !!isSharedWith;
        const thumbnailUrl = project.thumbnail_path
          ? `${getThumbnailUrl(project.thumbnail_path)}?v=${project.updated_at}`
          : null;

        return (
          <TableRow key={project.id}>
            {/* Name */}
            <TableCell className="w-[50%] max-w-0">
              <Link
                href={`/editor/${project.id}`}
                prefetch
                className="block w-full h-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden border bg-primary/5 flex items-center justify-center">
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // hide broken image gracefully
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="min-w-0 flex items-center gap-2">
                      <TruncateWithTooltip<HTMLHeadingElement>
                        tooltip={project.title}
                      >
                        {({ ref }) => (
                          <h3
                            ref={ref}
                            className="text-sm font-medium truncate hover:text-primary transition-colors"
                          >
                            {project.title}
                          </h3>
                        )}
                      </TruncateWithTooltip>
                      {project.project_type === "resume" && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[0.625rem] flex-shrink-0"
                        >
                          Resume
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </TableCell>

            {/* Owner */}
            <TableCell className="w-[20%] align-middle">
              <Link href={`/editor/${project.id}`} prefetch className="block">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isOwner ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  <span>{isOwner ? "You" : "Shared"}</span>
                </div>
              </Link>
            </TableCell>

            {/* Last modified */}
            <TableCell className="w-[25%] align-middle">
              <Link href={`/editor/${project.id}`} prefetch className="block">
                <span className="text-sm text-muted-foreground">
                  {formatDate(project.updated_at)}
                </span>
              </Link>
            </TableCell>

            {/* Actions */}
            <TableCell className="w-[5%] text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted"
                    aria-label="Actions"
                  >
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/editor/${project.id}`}
                      prefetch
                      className="cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Open
                    </Link>
                  </DropdownMenuItem>
                  {isOwner && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShareModalOpen(true);
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                  )}
                  {canRename && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => onRenameRequest(project.id, project.title)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      {canRename && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        className="text-destructive cursor-pointer"
                        onClick={() =>
                          onDeleteProject(
                            project.id,
                            project.typ_path,
                            project.thumbnail_path,
                          )
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        );
      });
    }, [
      projects,
      currentUser.id,
      isCXO,
      onDeleteProject,
      onRenameRequest,
      shareModalOpen,
      selectedProjectId,
    ]);

    return (
      <div className="w-full overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%] max-w-0">Name</TableHead>
              <TableHead className="w-[20%]">Owner</TableHead>
              <TableHead className="w-[25%]">Last modified</TableHead>
              <TableHead className="w-[5%] text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows}</TableBody>
        </Table>

        {/* Share Modal */}
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedProjectId(null);
          }}
          projectId={selectedProjectId || ""}
          currentUserId={currentUser.id}
        />
      </div>
    );
  },
);

ProjectList.displayName = "ProjectList";
export { ProjectList };
