"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface RedirectToEditorProps {
  projectId?: string;
}

export default function RedirectToEditor({ projectId }: RedirectToEditorProps) {
  const router = useRouter();

  useEffect(() => {
    if (projectId) {
      router.replace(`/editor/${projectId}`);
    }
  }, [projectId]);

  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
