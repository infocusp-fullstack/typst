import React from "react";
import { ProjectCard } from "./ProjectCard";
import { Project } from "@/types";
import { User } from "@supabase/supabase-js";

interface ProjectGridProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (
    projectId: string,
    typPath: string,
    thumbnail_path?: string
  ) => void;
  navigatingToEditor: string | null;
  currentUser: User;
  isCXO: boolean;
}

const ProjectGrid = React.memo(
  ({
    projects,
    onOpenProject,
    onDeleteProject,
    navigatingToEditor,
    currentUser,
    isCXO,
  }: ProjectGridProps) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {projects.map((project, index) => (
          <ProjectCard
            key={`${project.id}-${index}`}
            project={project}
            onOpen={() => onOpenProject(project.id)}
            onDelete={() =>
              onDeleteProject(
                project.id,
                project.typ_path,
                project.thumbnail_path
              )
            }
            isNavigating={navigatingToEditor === project.id}
            currentUser={currentUser}
            isCXO={isCXO}
          />
        ))}
      </div>
    );
  }
);

ProjectGrid.displayName = "ProjectGrid";
export { ProjectGrid };
