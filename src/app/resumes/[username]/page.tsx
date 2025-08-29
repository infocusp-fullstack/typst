"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPublicResume } from "@/lib/projectService";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui/loading";
import { $typst } from "@myriaddreamin/typst-all-in-one.ts";

export default function ResumePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  // const { $typst, isReady: isTypstReady, error: typError } = useTypst();
  const { user, isLoading: authLoading } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compiling, setCompiling] = useState<boolean>(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent(window.location.pathname);
      router.push(`/login?redirect=${redirect}`);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadResume = async () => {
      if (!$typst || !user) return;

      try {
        setCompiling(true);
        const resumeData = await fetchPublicResume(username);

        if (!resumeData || !resumeData.signedUrl) {
          setError("Resume not found or unavailable.");
          setCompiling(false);
          return;
        }

        // Download the Typst source
        const response = await fetch(resumeData.signedUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          setError("Failed to download resume source.");
          setCompiling(false);
          return;
        }

        const resumeContent = await response.text();

        if (resumeContent.trim() !== "") {
          const pdfContent = await $typst.pdf({ mainContent: resumeContent });
          const blob = new Blob([pdfContent as BlobPart], {
            type: "application/pdf",
          });

          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setError(null);
        }
      } catch (err) {
        console.error("Error rendering resume:", err);
        setError("Something went wrong while rendering your resume.");
      } finally {
        setCompiling(false);
      }
    };

    loadResume();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [user, $typst, username]);

  if (authLoading) {
    return <Loading text="Loading..." fullScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Resume not available</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="btn">
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        {compiling || !pdfUrl ? (
          <div className="h-full flex items-center justify-center">
            <Loading text="Getting ready..." />
          </div>
        ) : (
          <iframe title="Resume" src={pdfUrl} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
