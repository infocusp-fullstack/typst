import { useState, useEffect, useRef } from "react";

export function useTypst() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const typstRef = useRef<{
    pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
    ready?: Promise<void>;
  } | null>(null);

  const loadTypst = async () => {
    if (typstRef.current) return typstRef.current;
    if (isLoading) return null;

    try {
      setIsLoading(true);
      const { $typst } = await import("@myriaddreamin/typst-all-in-one.ts");
      if ($typst.ready) {
        await $typst.ready;
      }
      typstRef.current = $typst;
      setIsReady(true);
      return $typst;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize Typst",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-load Typst on mount for immediate availability
    loadTypst();
  }, []);

  return {
    $typst: typstRef.current,
    isReady,
    error,
    isLoading,
    loadTypst,
  };
}
