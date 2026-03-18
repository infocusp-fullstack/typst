"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui/loading";
import { TypstProvider } from "@/hooks/useTypstProvider";

const TypstEditor = dynamic(() => import("@/components/editor/TypstEditor"), {
  ssr: false,
  loading: () => <Loading text="Loading editor..." fullScreen />,
});

export default function EditorPage() {
  const params = useParams();
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [editorKey, setEditorKey] = useState<number>(Math.random());

  const triggerReload = () => {
    setEditorKey(Math.random());
  };

  // Extract the actual projectId from URL (e.g., /editor/abc123 → projectId = "abc123")
  const projectId = params.projectId as string;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    return <Loading text="Loading..." fullScreen />;
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Pass the dynamic projectId to the Editor component
  return (
    <TypstProvider>
      <TypstEditor
        key={editorKey}
        projectId={projectId}
        user={user}
        signOut={signOut}
        triggerReload={triggerReload}
      />
    </TypstProvider>
  );
}
