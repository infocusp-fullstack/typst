"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  createNewProject,
  createProjectFromTemplate,
  deleteProject,
  renameProject,
  userHasResume,
} from "@/lib/projectService";
import { Header } from "./Header";
import ViewToggle from "./ViewToggle";
import { FilterDropdown } from "@/components/dashboard/FilterDropdown";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import { ProjectList } from "@/components/dashboard/ProjectList";
import { useInfiniteScroll } from "@/hooks/useInfininiteScroll";
import { NewDocumentCard } from "@/components/dashboard/NewDocumentCard";
import { RenameModal } from "@/components/dashboard/RenameModal";
import { FilterType, Template } from "@/types";
import { isCXOByEmail } from "@/lib/sharingService";
import { useDialog } from "@/hooks/useDialog";
import { showToast } from "@/lib/toast";

interface DashboardProps {
  user: User;
  signOut: () => Promise<void>;
}

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

const showErrorAlert = (operation: string) => {
  showToast.error(`Failed to ${operation}`);
};

export default function Dashboard({ user, signOut }: DashboardProps) {
  const { confirm, prompt } = useDialog();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [navigatingToEditor, setNavigatingToEditor] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<FilterType>("owned");
  const [isCXO, setIsCXO] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    projectId: string;
    currentTitle: string;
  }>({
    isOpen: false,
    projectId: "",
    currentTitle: "",
  });

  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Create user-specific localStorage keys
  const getViewModeKey = () => `dashboard-view-mode-${user.id}`;
  const getFilterKey = () => `dashboard-filter-${user.id}`;

  // Debounce search query (only after preferences are loaded)
  useEffect(() => {
    if (!preferencesLoaded) return;
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, preferencesLoaded]);

  // Load view and filter preferences from localStorage (user-specific)
  useEffect(() => {
    const loadUserPreferences = async () => {
      // Check CXO status
      try {
        const cxoSstatus = await isCXOByEmail(user.email);
        setIsCXO(cxoSstatus);
      } catch (error) {
        console.error("Error checking CXO status:", error);
        setIsCXO(false);
      }

      // Load view mode preference
      const savedView = localStorage.getItem(getViewModeKey()) as
        | "grid"
        | "list";
      if (savedView && (savedView === "grid" || savedView === "list")) {
        setViewMode(savedView);
      }

      // Load filter preference
      const savedFilter = localStorage.getItem(getFilterKey()) as FilterType;
      if (
        savedFilter &&
        (savedFilter === "owned" ||
          savedFilter === "shared" ||
          savedFilter === "all")
      ) {
        setFilter(savedFilter);
      }

      setPreferencesLoaded(true);
    };

    loadUserPreferences();
  }, [user.id]);

  // Use infinite scroll hook with filter
  const {
    projects,
    isLoading,
    isLoadingMore,
    error,
    totalCount,
    refresh,
    observerRef,
    optimisticRename,
    optimisticRemove,
  } = useInfiniteScroll({
    initialLoad: preferencesLoaded,
    searchQuery: debouncedSearchQuery,
    pageSize: 20,
    filter,
    userId: user.id,
    userEmail: user.email || "",
  });

  // Open rename modal via prop callback (replaces event-based approach)
  const openRenameModal = useCallback(
    (projectId: string, currentTitle: string) => {
      setRenameModal({ isOpen: true, projectId, currentTitle });
    },
    [],
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleViewChange = (newView: "grid" | "list") => {
    setViewMode(newView);
    localStorage.setItem(getViewModeKey(), newView);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    localStorage.setItem(getFilterKey(), newFilter);
    // Reset search when changing filter
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const handleCreateNewDocument = useCallback(async () => {
    if (isCreating) return;

    const title = await prompt({
      title: "Create new document",
      description: "Give your document a clear, memorable name.",
      label: "Document name",
      placeholder: "My New Document",
      defaultValue: "My New Document",
      required: true,
    });
    if (!title?.trim()) return;

    try {
      setIsCreating(true);
      const newProject = await createNewProject(user.id, title.trim());

      router.push(`/editor/${newProject.id}`);
    } catch {
      showErrorAlert("create document");
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, user.id, router, prompt]);

  const handleOpenProject = useCallback(
    (projectId: string) => {
      setNavigatingToEditor(projectId);
      // Hint router to prefetch editor route chunk
      try {
        router?.prefetch?.(`/editor/${projectId}`);
      } catch {
        // ignore
      }
      router.push(`/editor/${projectId}`);
    },
    [router],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string, typPath: string, thumbnail_path?: string) => {
      const ok = await confirm({
        title: "Delete this project?",
        description:
          "This will permanently delete the project and its files. This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!ok) return;

      try {
        optimisticRemove(projectId);
        await deleteProject(projectId, typPath, thumbnail_path);
        showToast.success("Project deleted successfully");
      } catch {
        // Refresh on error
        refresh();
        showErrorAlert("delete");
      }
    },
    [refresh, confirm],
  );

  const handleRenameProject = useCallback(
    async (projectId: string, newTitle: string) => {
      try {
        optimisticRename(projectId, newTitle);
        await renameProject(projectId, newTitle);
        showToast.success("Project renamed successfully");
      } catch (err) {
        // Refresh on error
        refresh();
        showErrorAlert("rename");
        throw err;
      }
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    const ok = await confirm({
      title: "Sign out?",
      description: "You will need to sign in again to continue.",
      confirmText: "Sign out",
      cancelText: "Stay",
    });
    if (!ok) return;

    try {
      await signOut();
    } catch {
      showToast.error("Failed to sign out");
    }
  }, [signOut, confirm]);

  const handleCreateFromTemplate = useCallback(
    async (template: Template) => {
      if (isCreating || isCreatingFromTemplate) return;

      try {
        setIsCreatingFromTemplate(true);
        if (template.category === "resume") {
          const alreadyHas = await userHasResume(user.id);
          if (alreadyHas) {
            showToast.warning(
              "You already have a resume. Please delete it before creating a new one.",
            );
            return;
          }
        }

        const title = await prompt({
          title: "Name your document",
          label: "Document name",
          placeholder: template.title + " Copy",
          defaultValue: template.title + " Copy",
          required: true,
        });
        if (!title?.trim()) return;

        const newProject = await createProjectFromTemplate(
          user.id,
          title.trim(),
          template,
          template.category === "resume" ? "resume" : "document",
        );

        router.push(`/editor/${newProject.id}`);
      } catch (err) {
        console.error("Error creating project from template:", err);
        showToast.error("Something went wrong while creating your document.");
      } finally {
        setIsCreatingFromTemplate(false);
      }
    },
    [isCreating, isCreatingFromTemplate, user.id, router, prompt],
  );

  const EmptyState = useMemo(
    () => (
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
            <Button onClick={handleCreateNewDocument} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          )}
        </CardContent>
      </Card>
    ),
    [searchQuery, handleCreateNewDocument, isCreating],
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

  const getFilterTitle = () => {
    switch (filter) {
      case "owned":
        return "My documents";
      case "shared":
        return "Shared with me";
      case "all":
        return "All documents";
      default:
        return "Recent documents";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        user={user}
        theme={theme}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onToggleTheme={toggleTheme}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Create Document Section */}
          <NewDocumentCard
            userId={user.id}
            isCreating={isCreating}
            isCreatingFromTemplate={isCreatingFromTemplate}
            onCreate={handleCreateNewDocument}
            onCreateFromTemplate={handleCreateFromTemplate}
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
            {!preferencesLoaded || isLoading ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 w-1/2">
                  <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-9 w-36 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-28 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium">
                    {getFilterTitle()}
                    {!isLoading && totalCount > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({projects.length} of {totalCount})
                      </span>
                    )}
                  </h2>
                </div>

                <div className="flex items-center gap-4">
                  <FilterDropdown
                    filter={filter}
                    onFilterChange={handleFilterChange}
                    user={user}
                    isCXO={isCXO}
                  />

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
            )}

            {/* Content Area */}
            {!preferencesLoaded || isLoading ? (
              viewMode === "grid" ? (
                <GridSkeleton />
              ) : (
                <ListSkeleton />
              )
            ) : projects.length === 0 ? (
              EmptyState
            ) : (
              <>
                {viewMode === "grid" ? (
                  <ProjectGrid
                    projects={projects}
                    onOpenProject={handleOpenProject}
                    onDeleteProject={handleDeleteProject}
                    navigatingToEditor={navigatingToEditor}
                    currentUser={user}
                    isCXO={isCXO}
                    onRenameRequest={openRenameModal}
                  />
                ) : (
                  <ProjectList
                    projects={projects}
                    onOpenProject={handleOpenProject}
                    onDeleteProject={handleDeleteProject}
                    navigatingToEditor={navigatingToEditor}
                    currentUser={user}
                    isCXO={isCXO}
                    onRenameRequest={openRenameModal}
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
