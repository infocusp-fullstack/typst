import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit3, FileText, MoreVertical, Trash2, Users } from "lucide-react";
import { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}

const ProjectCard = React.memo(
  ({ project, onOpen, onDelete }: ProjectCardProps) => {
    const [isNavigating, setIsNavigating] = useState(false);

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
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
      <div className="group relative cursor-pointer" onClick={handleOpen}>
        <div className="relative w-full aspect-[210/297] bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background">
            <div className="flex items-center justify-center h-2/3">
              <FileText className="h-16 w-16 text-primary/30" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-card border-t border-border">
              <h3 className="text-sm font-medium truncate hover:text-primary transition-colors">
                {project.title.charAt(0).toUpperCase() + project.title.slice(1)}
              </h3>
              <div className="flex gap-2">
                <div className="w-4 h-4 bg-primary rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(project.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {isNavigating && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs text-muted-foreground font-medium">
                  Opening...
                </span>
              </div>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center hover:bg-muted rounded-full cursor-pointer">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </div>
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

ProjectCard.displayName = "ProjectCard";
export { ProjectCard };
