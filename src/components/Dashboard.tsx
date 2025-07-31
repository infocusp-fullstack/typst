"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchUserProjects,
  createNewProject,
  deleteProject,
} from "@/lib/projectService";
import {
  Plus,
  Search,
  LogOut,
  RefreshCw,
  Trash2,
  MoreVertical,
  Moon,
  Sun,
  FileText,
  Edit3,
  Users,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Project } from "@/types";

interface DashboardProps {
  user: User;
  signOut: () => Promise<void>;
}

// Helper function to format dates
const formatDate = (date: string) => {
  const projectDate = new Date(date);
  return projectDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function Dashboard({ user, signOut }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [navigatingToEditor, setNavigatingToEditor] = useState<string | null>(
    null
  );
  const { theme, toggleTheme } = useTheme();

  const router = useRouter();

  // Handle Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById(
          "search-input"
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keyboard shortcut label
  const isMac =
    // @ts-expect-error this is fine
    navigator.userAgentData?.platform?.toLowerCase().includes("mac") ?? false;
  const shortcutLabel = isMac ? (
    <>
      <span
        className={`font-mono text-xs px-1.5 bg-muted text-muted-foreground py-0.5 rounded mr-1`}
      >
        ⌘
      </span>
      <span
        className={`font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded`}
      >
        K
      </span>
    </>
  ) : (
    <>
      <span
        className={`font-mono text-xs px-1.5 bg-muted text-muted-foreground py-0.5 rounded mr-1`}
      >
        Ctrl
      </span>
      <span
        className={`font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded`}
      >
        K
      </span>
    </>
  );

  const initializeDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // const storageOK = await checkStorageAccess();
      // if (!storageOK) {
      //   setError(
      //     "Storage access failed. Please check your Supabase configuration."
      //   );
      //   return;
      // }

      await loadProjects();
    } catch {
      setError("Failed to initialize dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProjects();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadProjects = async () => {
    try {
      const userProjects = await fetchUserProjects();
      setProjects(userProjects);
    } catch {
      setError("Failed to load projects");
    }
  };

  const handleCreateNewDocument = async () => {
    if (isCreating) return;

    const title = prompt(
      "What would you like to name your document?",
      "My New Document"
    );
    if (!title || !title.trim()) return;

    try {
      setIsCreating(true);
      const newProject = await createNewProject(user.id, title.trim());
      setProjects((prev) => [newProject, ...prev]);
      setNavigatingToEditor(newProject.id);
      router.push(`/editor/${newProject.id}`);
    } catch (err) {
      if (err instanceof Error) {
        alert(`Failed to create document: ${err.message}`);
      } else {
        alert("Failed to create document due to unknown error.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, typPath: string) => {
    if (!confirm("Delete this project forever? This action cannot be undone."))
      return;

    try {
      await deleteProject(projectId, typPath);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      if (err instanceof Error) {
        alert(`Failed to delete document: ${err.message}`);
      } else {
        alert("Failed to delete document due to unknown error.");
      }
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await signOut();
      } catch {
        alert("Failed to sign out. Please try again.");
      }
    }
  };

  const getUserName = () => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }

    const emailName = user.email?.split("@")[0];
    if (emailName) {
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }

    return "User";
  };

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-14 items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                T
              </span>
            </div>
            <span className="font-semibold text-lg">Typst Resume</span>
          </div>

          {/* Search Bar in Header */}
          <div className="flex-1 flex justify-center">
            <div className="relative max-w-md w-full">
              <Search className="rounded absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search documents..."
                className="pl-10 pr-24 bg-background/50 supports-[backdrop-filter]:bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {shortcutLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getUserName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserName()}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Create Document Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Start a new document</h2>
            <div className="flex gap-4">
              <Card
                className="w-48 h-56 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
                onClick={handleCreateNewDocument}
              >
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    {isCreating ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Plus className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">
                    {isCreating ? "Creating..." : "Blank Document"}
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Display */}
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
                      onClick={initializeDashboard}
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
            <div className="flex items-center gap-x-4">
              <h2 className="text-lg font-medium">Recent documents</h2>

              <div className="flex items-end justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadProjects}
                  className="cursor-pointer"
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full aspect-[210/297] bg-muted rounded-lg mb-3" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative cursor-pointer"
                    onClick={() => {
                      setNavigatingToEditor(project.id);
                      router.push(`/editor/${project.id}`);
                    }}
                  >
                    {/* Document Preview Card */}
                    <div className="relative w-full aspect-[210/297] bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-3 overflow-hidden">
                      {/* Document preview background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background">
                        {/* File icon */}
                        <div className="flex items-center justify-center h-2/3">
                          <FileText className="h-16 w-16 text-primary/30" />
                        </div>

                        {/* Document title at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-card border-t border-border">
                          <h3 className="text-sm font-medium truncate hover:text-primary transition-colors">
                            {project.title.charAt(0).toUpperCase() +
                              project.title.slice(1)}
                          </h3>
                          <div className="flex gap-2">
                            <div className="w-4 h-4 bg-primary rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                              <FileText className="h-3 w-3 text-primary-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mt-1">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(project.updated_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Loading overlay */}
                      {navigatingToEditor === project.id && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}

                      {/* Menu button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center hover:bg-muted rounded-full cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setNavigatingToEditor(project.id);
                              router.push(`/editor/${project.id}`);
                            }}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id, project.typ_path);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
