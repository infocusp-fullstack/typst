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
import React from "react";

interface ProjectListItemProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}

const ProjectListItem = React.memo(
  ({ project, onOpen, onDelete }: ProjectListItemProps) => {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return (
      <div
        className="group flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={onOpen}
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

        {/* ❌ REMOVE the loading state section completely */}

        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
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
