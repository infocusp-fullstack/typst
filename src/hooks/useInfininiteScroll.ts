import { useState, useEffect, useCallback, useRef } from "react";
import { Project, FilterType } from "@/types";
import { fetchUserProjects, searchUserProjects } from "@/lib/projectService";

interface UseInfiniteScrollOptions {
  initialLoad?: boolean;
  searchQuery?: string;
  pageSize?: number;
  filter?: FilterType;
  userId?: string;
  userEmail?: string;
}

interface UseInfiniteScrollReturn {
  projects: Project[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
  refresh: () => void;
  observerRef: (node: HTMLElement | null) => void;
  optimisticRemove: (projectId: string) => void;
  optimisticRename: (projectId: string, newTitle: string) => void;
}

export function useInfiniteScroll({
  initialLoad = true,
  searchQuery = "",
  pageSize = 20,
  filter = "owned",
  userId = "",
  userEmail = "",
}: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const currentSearchQuery = useRef(searchQuery);
  const currentFilter = useRef(filter);
  const currentUserId = useRef(userId);
  const currentUserEmail = useRef(userEmail);

  // Update the current refs whenever they change
  useEffect(() => {
    currentSearchQuery.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    currentFilter.current = filter;
  }, [filter]);

  useEffect(() => {
    currentUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    currentUserEmail.current = userEmail;
  }, [userEmail]);

  // Stable loadProjects function
  const loadProjects = useCallback(
    async (page: number, isRefresh: boolean = false, queryToUse?: string) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      const searchQueryToUse = queryToUse ?? currentSearchQuery.current;
      const filterToUse = currentFilter.current;
      const userIdToUse = currentUserId.current;

      try {
        if (page === 0) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        setError(null);

        const result = searchQueryToUse.trim()
          ? await searchUserProjects(
              searchQueryToUse,
              page,
              pageSize,
              filterToUse,
              userIdToUse,
            )
          : await fetchUserProjects(page, pageSize, filterToUse, userIdToUse);

        if (isRefresh || page === 0) {
          setProjects([...result.projects]);
        } else {
          setProjects((prev) => [...prev, ...result.projects]);
        }

        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setCurrentPage(page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load projects",
        );
        // Reset to empty state on error
        if (page === 0) {
          setProjects([]);
          setHasMore(false);
          setTotalCount(0);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [pageSize],
  );

  // Load more function
  const loadMore = useCallback(() => {
    if (hasMore && !loadingRef.current) {
      loadProjects(currentPage + 1);
    }
  }, [hasMore, currentPage, loadProjects]);

  // Stable refresh function
  const refresh = useCallback(() => {
    setCurrentPage(0);
    loadProjects(0, true);
  }, [loadProjects]);

  // Optimistic helpers
  const optimisticRemove = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTotalCount((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const optimisticRename = useCallback(
    (projectId: string, newTitle: string) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, title: newTitle } : p)),
      );
    },
    [],
  );

  // Stable observer callback
  const observerRef = useCallback(
    (node: HTMLElement | null) => {
      if (loadingRef.current) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
            loadMore();
          }
        },
        {
          threshold: 0.1,
          rootMargin: "100px",
        },
      );

      if (node) observer.current.observe(node);
    },
    [hasMore, loadMore],
  );

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      loadProjects(0, true);
    }
  }, [initialLoad, loadProjects]);

  // Handle search query changes (only after initial load is allowed)
  useEffect(() => {
    if (!initialLoad) return;
    // Reset pagination and reload when search query changes
    setCurrentPage(0);
    loadProjects(0, true, searchQuery);
  }, [searchQuery, loadProjects, initialLoad]);

  // Handle filter changes
  useEffect(() => {
    if (!initialLoad) return;
    // Reset pagination and reload when filter changes
    setCurrentPage(0);
    setProjects([]);
    setHasMore(true);
    setTotalCount(0);
    loadProjects(0, true);
  }, [filter, loadProjects, initialLoad]);

  // Handle userId changes (for user-specific preferences) — only after initial load allowed
  useEffect(() => {
    if (!initialLoad) return;
    // Reset pagination and reload when userId changes
    setCurrentPage(0);
    setProjects([]);
    setHasMore(true);
    setTotalCount(0);
    loadProjects(0, true);
  }, [userId, loadProjects, initialLoad]);

  // Cleanup observer
  useEffect(() => {
    const currentObserver = observer.current;
    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, []);

  return {
    projects,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    observerRef,
    optimisticRemove,
    optimisticRename,
  };
}
