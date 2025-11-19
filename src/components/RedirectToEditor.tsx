"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface RedirectToEditorProps {
  projectId?: string;
  redirectTo?: string;
  isLoginRedirect?: boolean;
}

export default function RedirectToEditor({
  projectId,
  redirectTo,
  isLoginRedirect,
}: RedirectToEditorProps) {
  const router = useRouter();

  useEffect(() => {
    if (isLoginRedirect) {
      router.replace(redirectTo!);
      return;
    }

    if (projectId) {
      router.replace(`/editor/${projectId}`);
    }
  }, [projectId, redirectTo, isLoginRedirect]);

  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
