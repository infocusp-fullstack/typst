import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit3, FileText, MoreVertical, Trash2 } from "lucide-react";
import { Project } from "@/types";
import React, { useState } from "react";

interface ProjectListItemProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}

const ProjectListItem = React.memo(
  ({ project, onOpen, onDelete }: ProjectListItemProps) => {
    const [isNavigating, setIsNavigating] = useState(false);

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const handleOpen = () => {
      setIsNavigating(true);
      setTimeout(() => {
        onOpen();
      }, 100);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
    };

    const handleMenuOpen = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsNavigating(true);
      setTimeout(() => {
        onOpen();
      }, 100);
    };

    return (
      <div
        className={`group flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-all cursor-pointer ${
          isNavigating ? "bg-muted/30" : ""
        }`}
        onClick={handleOpen}
      >
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate text-sm mb-1">{project.title}</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Modified {formatDate(project.updated_at)}</span>
            <span className="hidden sm:inline">Typst Document</span>
          </div>
        </div>

        <div className="flex-shrink-0 w-20 flex justify-center">
          {isNavigating ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs text-muted-foreground hidden md:block">
                Opening...
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground hidden md:block">
              Ready
            </span>
          )}
        </div>

        {/* Actions Menu */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                disabled={isNavigating}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMenuOpen}>
                <Edit3 className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }
);

ProjectListItem.displayName = "ProjectListItem";
export { ProjectListItem };
