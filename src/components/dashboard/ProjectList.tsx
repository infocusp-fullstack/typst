import React from "react";
import { ProjectListItem } from "./ProjectListItem";
import { Project } from "@/types";
import { User } from "@supabase/supabase-js";

interface ProjectListProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (
    projectId: string,
    typPath: string,
    thumbnail_path?: string,
  ) => void;
  navigatingToEditor: string | null;
  currentUser: User;
  isCXO: boolean;
  onRenameRequest: (projectId: string, currentTitle: string) => void;
}

const ProjectList = React.memo(
  ({
    projects,
    onOpenProject,
    onDeleteProject,
    navigatingToEditor,
    currentUser,
    isCXO,
    onRenameRequest,
  }: ProjectListProps) => {
    return (
      <div className="space-y-2">
        {projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            onOpen={() => onOpenProject(project.id)}
            onDelete={() =>
              onDeleteProject(
                project.id,
                project.typ_path,
                project.thumbnail_path,
              )
            }
            isNavigating={navigatingToEditor === project.id}
            currentUser={currentUser}
            isCXO={isCXO}
            onRename={() => onRenameRequest(project.id, project.title)}
          />
        ))}
      </div>
    );
  },
);

ProjectList.displayName = "ProjectList";
export { ProjectList };
