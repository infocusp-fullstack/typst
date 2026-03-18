import { fetchUserProjectById } from "@/lib/projectService";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const DEFAULT_TITLE = "Infocusp Resumes";
  const DEFAULT_DESCRIPTION = "A modern document editor with real-time preview";

  try {
    const project = await fetchUserProjectById(projectId);

    const projectTitle = project?.title
      ? `${project.title} - ${DEFAULT_TITLE}`
      : DEFAULT_TITLE;

    return {
      title: projectTitle,
      description: DEFAULT_DESCRIPTION,
    };
  } catch (error) {
    console.error("Failed to set metadata:", error);
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    };
  }
}

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
