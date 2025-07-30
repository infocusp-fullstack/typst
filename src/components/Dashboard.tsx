"use client";

import { useState, useEffect, useCallback, memo } from "react";
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
  checkStorageAccess,
  type Project,
} from "@/lib/projectService";
import {
  Plus,
  Search,
  LogOut,
  Trash2,
  MoreVertical,
  Moon,
  Sun,
  FileText,
  Edit3,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";

interface DashboardProps {
  user: User;
  signOut: () => Promise<void>;
}

/* ✅ Helper – Format Dates */
const formatDate = (date: string) => {
  const projectDate = new Date(date);
  return projectDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/* ✅ MEMOIZED PROJECT CARD – avoids unnecessary re-renders */
const ProjectCard = memo(function ProjectCard({
  project,
  navigatingToEditor,
  onOpen,
  onDelete,
}: {
  project: Project;
  navigatingToEditor: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string, path: string) => void;
}) {
  return (
    <div
      className="group relative cursor-pointer"
      onClick={() => onOpen(project.id)}
    >
      {/* Document Preview */}
      <div className="relative w-full aspect-[210/297] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md dark:hover:shadow-gray-900/20 transition-shadow duration-200 mb-3 overflow-hidden">
        {/* Simple document preview */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 dark:from-blue-950/30 to-white dark:to-gray-800">
          {/* File icon */}
          <div className="flex items-center justify-center h-2/3">
            <FileText className="h-16 w-16 text-blue-300 dark:text-blue-700 opacity-60" />
          </div>

          {/* Document title at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {project.title.charAt(0).toUpperCase() + project.title.slice(1)}
            </h3>
            <div className="flex gap-2">
              <div className="w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(project.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {navigatingToEditor === project.id && (
          <div className="absolute inset-0 bg-black/10 dark:bg-black/30 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
          </div>
        )}

        {/* Menu button */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <div
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onOpen(project.id);
              }}
              className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id, project.typ_path);
              }}
              className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 focus:bg-red-100 dark:focus:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
/* ✅ MEMOIZED SEARCH BAR */
const SearchBar = memo(function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
      <Input
        placeholder="Search documents"
        className="pl-10 w-96 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
});

/* ✅ MEMOIZED NEW DOCUMENT CARD */
const NewDocumentCard = memo(function NewDocumentCard({
  isCreating,
  onCreate,
}: {
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <Card
      className="w-48 h-56 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-all duration-200 cursor-pointer group bg-white dark:bg-gray-800"
      onClick={onCreate}
    >
      <CardContent className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
          {isCreating ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
          ) : (
            <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          {isCreating ? "Creating..." : "Blank"}
        </span>
      </CardContent>
    </Card>
  );
});

export default function Dashboard({ user, signOut }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [navigatingToEditor, setNavigatingToEditor] = useState<string | null>(
    null
  );

  const { theme, setTheme } = useTheme();
  const router = useRouter();

  /* ✅ Prefetch editor pages for instant navigation */
  useEffect(() => {
    projects.forEach((p) => router.prefetch(`/editor/${p.id}`));
  }, [projects, router]);

  /* ✅ Initialize dashboard */
  const initializeDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const storageOK = await checkStorageAccess();
      if (!storageOK) {
        setError(
          "Storage access failed. Please check your Supabase configuration."
        );
        return;
      }
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

  const loadProjects = async () => {
    try {
      const userProjects = await fetchUserProjects();
      setProjects(userProjects);
    } catch {
      setError("Failed to load projects");
    }
  };

  const handleOpenDocument = useCallback(
    (id: string) => {
      router.push(`/editor/${id}`);
      const timer = setTimeout(() => setNavigatingToEditor(id), 300);
      setTimeout(() => clearTimeout(timer), 1200);
    },
    [router]
  ); // ✅ Only re-created if router changes

  const handleDeleteProject = useCallback(
    async (projectId: string, typPath: string) => {
      if (
        !confirm("Delete this project forever? This action cannot be undone.")
      )
        return;
      try {
        await deleteProject(projectId, typPath);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err) {
        alert(`Failed to delete document: ${(err as Error).message}`);
      }
    },
    []
  );
  const handleCreateNewDocument = useCallback(async () => {
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
      router.push(`/editor/${newProject.id}`);
    } catch (err) {
      alert(`Failed to create document: ${(err as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, user.id, router]);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      try {
        await signOut();
      } catch {
        alert("Failed to sign out. Please try again.");
      }
    }
  };

  /* ✅ Username helper */
  const getUserName = () => {
    if (user.user_metadata?.display_name)
      return user.user_metadata.display_name;
    const emailName = user.email?.split("@")[0];
    return emailName
      ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
      : "User";
  };

  /* ✅ Filter projects */
  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* HEADER stays exactly same */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="font-medium text-xl text-gray-700 dark:text-gray-200">
              Typst Documents
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search bar */}
            <div className="relative">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />{" "}
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 dark:bg-blue-500 text-white">
                      {getUserName().charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">
                      {getUserName()}
                    </p>
                    <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT stays same */}
      <main className="p-6 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {/* Templates Section */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Start a new document
            </h2>
            <div className="flex gap-4">
              <NewDocumentCard
                isCreating={isCreating}
                onCreate={handleCreateNewDocument}
              />
            </div>
          </div>

          {/* Recent Documents Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Recent documents
              </h2>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <div className="text-xl">⚠️</div>
                  <div>
                    <p className="font-medium">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={initializeDashboard}
                      className="mt-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="w-full aspect-[210/297] bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery ? "No documents found" : "No documents yet"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Create your first document to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={handleCreateNewDocument}
                    disabled={isCreating}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    navigatingToEditor={navigatingToEditor}
                    onOpen={handleOpenDocument}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
