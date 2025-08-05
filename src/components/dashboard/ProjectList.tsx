import React from "react";
import { ProjectListItem } from "./ProjectListItem";
import { Project } from "@/types";

interface ProjectListProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string, typPath: string) => void;
  navigatingToEditor: string | null;
}

const ProjectList = React.memo(
  ({
    projects,
    onOpenProject,
    onDeleteProject,
    navigatingToEditor,
  }: ProjectListProps) => {
    return (
      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            onOpen={() => onOpenProject(project.id)}
            onDelete={() => onDeleteProject(project.id, project.typ_path)}

            isNavigating={navigatingToEditor === project.id}
          />
        ))}
      </div>
    );
  },
);

ProjectList.displayName = "ProjectList";
export { ProjectList };
