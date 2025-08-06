"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  createNewProject,
  deleteProject,
  renameProject,
} from "@/lib/projectService";
import { Header } from "./Header";
import { ViewToggle } from "./ViewToggle";
import { ProjectGrid } from "./ProjectGrid";
import { ProjectList } from "./ProjectList";
import { useInfiniteScroll } from "@/hooks/useInfininiteScroll";
import { NewDocumentCard } from "./NewDocumentCard";
import { RenameModal } from "./RenameModal";

interface DashboardProps {
  user: User;
  signOut: () => Promise<void>;
}

export default function Dashboard({ user, signOut }: DashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [navigatingToEditor, setNavigatingToEditor] = useState<string | null>(
    null
  );
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    projectId: string;
    currentTitle: string;
  }>({
    isOpen: false,
    projectId: "",
    currentTitle: "",
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use infinite scroll hook
  const {
    projects,
    isLoading,
    isLoadingMore,
    error,
    totalCount,
    refresh,
    observerRef,
  } = useInfiniteScroll({
    searchQuery: debouncedSearchQuery,
    pageSize: 20,
  });

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("dashboard-view-mode") as
      | "grid"
      | "list";
    if (savedView && (savedView === "grid" || savedView === "list")) {
      setViewMode(savedView);
    }
  }, []);

  // Listen for rename events
  useEffect(() => {
    const handleRenameEvent = (event: CustomEvent) => {
      const { projectId, currentTitle } = event.detail;
      setRenameModal({
        isOpen: true,
        projectId,
        currentTitle,
      });
    };

    window.addEventListener(
      "rename-project",
      handleRenameEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "rename-project",
        handleRenameEvent as EventListener
      );
    };
  }, []);

  const handleViewChange = (newView: "grid" | "list") => {
    setViewMode(newView);
    localStorage.setItem("dashboard-view-mode", newView);
  };

  // Refresh projects when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const handleCreateNewDocument = useCallback(async () => {
    if (isCreating) return;

    const title = prompt(
      "What would you like to name your document?",
      "My New Document"
    );
    if (!title?.trim()) return;

    try {
      setIsCreating(true);
      const newProject = await createNewProject(user.id, title.trim());

      // Add the new project to the beginning of the list
      // Note: You might want to refresh instead to ensure proper ordering
      refresh();

      setNavigatingToEditor(newProject.id);
      router.push(`/editor/${newProject.id}`);
    } catch (err) {
      alert(
        `Failed to create document: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, user.id, router, refresh]);

  const handleOpenProject = useCallback(
    (projectId: string) => {
      setNavigatingToEditor(projectId);
      router.push(`/editor/${projectId}`);
    },
    [router]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string, typPath: string, thumbnail_path?: string) => {
      if (
        !confirm("Delete this project forever? This action cannot be undone.")
      )
        return;

      try {
        await deleteProject(projectId, typPath, thumbnail_path);
        // Refresh the list to ensure consistency
        refresh();
      } catch (err) {
        alert(
          `Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    },
    [refresh]
  );

  const handleRenameProject = useCallback(
    async (projectId: string, newTitle: string) => {
      try {
        await renameProject(projectId, newTitle);

        // Refresh the list to ensure consistency
        refresh();
      } catch (err) {
        alert(
          `Failed to rename: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        throw err;
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await signOut();
      } catch {
        alert("Failed to sign out");
      }
    }
  }, [signOut]);

  const GridSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {Array(10)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-[210/297] bg-muted rounded-lg mb-3" />
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
    </div>
  );

  const ListSkeleton = () => (
    <div className="space-y-2">
      {Array(8)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-4 p-4 border rounded-lg"
          >
            <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
            <div className="w-16" />
            <div className="w-8 h-8 bg-muted rounded" />
          </div>
        ))}
    </div>
  );

  const LoadMoreIndicator = () => (
    <div ref={observerRef} className="flex justify-center items-center py-8">
      {isLoadingMore && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        user={user}
        theme={theme}
        searchQuery={searchQuery}
        onSearchChange={useCallback(
          (query: string) => setSearchQuery(query),
          []
        )}
        onToggleTheme={toggleTheme}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Create Document Section */}
          <NewDocumentCard
            isCreating={isCreating}
            onCreate={handleCreateNewDocument}
          />

          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <p className="font-medium">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refresh}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">
                Recent documents
                {!isLoading && totalCount > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({projects.length} of {totalCount})
                  </span>
                )}
              </h2>

              <div className="flex items-center gap-4">
                <ViewToggle view={viewMode} onViewChange={handleViewChange} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
              viewMode === "grid" ? (
                <GridSkeleton />
              ) : (
                <ListSkeleton />
              )
            ) : projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? "No documents found" : "No documents yet"}
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Create your first document to get started"}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={handleCreateNewDocument}
                      disabled={isCreating}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Document
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <ProjectGrid
                    projects={projects}
                    onOpenProject={handleOpenProject}
                    onDeleteProject={handleDeleteProject}
                    navigatingToEditor={navigatingToEditor}
                  />
                ) : (
                  <ProjectList
                    projects={projects}
                    onOpenProject={handleOpenProject}
                    onDeleteProject={handleDeleteProject}
                    navigatingToEditor={navigatingToEditor}
                  />
                )}

                <LoadMoreIndicator />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Rename Modal */}
      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() =>
          setRenameModal({ isOpen: false, projectId: "", currentTitle: "" })
        }
        onRename={(newTitle) =>
          handleRenameProject(renameModal.projectId, newTitle)
        }
        currentTitle={renameModal.currentTitle}
        isLoading={isLoading}
      />
    </div>
  );
}
