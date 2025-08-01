import React from "react";
import { ProjectListItem } from "./ProjectListItem";
import { Project } from "@/types";

interface ProjectListProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string, typPath: string) => void;
}

const ProjectList = React.memo(
  ({ projects, onOpenProject, onDeleteProject }: ProjectListProps) => {
    return (
      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectListItem
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

ProjectList.displayName = "ProjectList";
export { ProjectList };
