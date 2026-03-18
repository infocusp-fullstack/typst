"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RedirectToEditor from "@/components/RedirectToEditor";
import { useAuth } from "@/hooks/useAuth";
import { getResumeByUsername } from "@/lib/sharingService";
import { Loader2 } from "lucide-react";
import showToast from "@/lib/toast";
import { useRef } from "react";

export default function Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const projectFetched = useRef<boolean>(false);

  useEffect(() => {
    if (isLoading || projectFetched.current) return;

    if (!user) {
      router.replace(
        `/login?redirectTo=${encodeURIComponent(`/resumes/${params.username}`)}`
      );
      return;
    }

    const fetchProjectId = async () => {
      projectFetched.current = true;
      try {
        const projectId = await getResumeByUsername(params.username);
        if (!projectId) {
          router.push("/dashboard");
          return;
        }
        setProjectId(projectId);
      } catch (error) {
        showToast.error(
          error instanceof Error
            ? error.message
            : "Unable to load, please try again"
        );
        router.replace("/dashboard");
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
