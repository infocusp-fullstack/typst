"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RedirectToEditor from "@/components/RedirectToEditor";
import { useAuth } from "@/hooks/useAuth";
import { getProjectByUsername } from "@/lib/sharingService";
import { Loader2 } from "lucide-react";

export default function Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const [projectId, setProjectId] = useState<string | undefined>();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace(
        `/login?redirectTo=${encodeURIComponent(params.username)}`
      );
      return;
    }

    const fetchProjectId = async () => {
      try {
        const projectId = await getProjectByUsername(params.username);
        if (!projectId) {
          router.push("/dashboard");
          return;
        }
        setProjectId(projectId);
      } catch (error) {
        console.error("Error while fetching project:", error);
      }
    };
    fetchProjectId();
  }, [user, isLoading, router]);

  if (!projectId && user) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <RedirectToEditor projectId={projectId} />;
}
