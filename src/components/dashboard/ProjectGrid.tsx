import React from "react";
import { ProjectCard } from "./ProjectCard";
import { Project } from "@/types";

interface ProjectGridProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string, typPath: string) => void;
}

const ProjectGrid = React.memo(
  ({ projects, onOpenProject, onDeleteProject }: ProjectGridProps) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={() => onOpenProject(project.id)}
            onDelete={() => onDeleteProject(project.id, project.typ_path)}
          />
        ))}
      </div>
    );
  }
);

ProjectGrid.displayName = "ProjectGrid";
export { ProjectGrid };
