"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

interface TypstContextType {
  $typst: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isReady: boolean;
  error: string | null;
  isLoading: boolean;
  compileAsync: (source: string) => Promise<Uint8Array>;
}

const TypstContext = createContext<TypstContextType | undefined>(undefined);

export function TypstProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const typstRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const createTempTypPath = () => {
    const random = Math.random().toString(36).slice(2, 10);
    const stamp = Date.now().toString(36);
    return `/tmp/editor-${stamp}-${random}.typ`;
  };

  const compileAsync = useCallback(
    async (source: string): Promise<Uint8Array> => {
      if (!typstRef.current) {
        // Wait up to 5 seconds for Typst to initialize
        for (let i = 0; i < 50; i++) {
          if (typstRef.current) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!typstRef.current) {
          console.error("Typst failed to initialize within timeout");
          throw new Error("Typst failed to initialize within timeout");
        }
      }

      const diagnosticsContainError = (value: unknown): boolean => {
        if (!value) return false;
        if (typeof value === "string") {
          return /(^|\W)error(\W|$)/i.test(value);
        }
        if (Array.isArray(value)) {
          return value.some((item) => diagnosticsContainError(item));
        }
        if (typeof value === "object") {
          const record = value as Record<string, unknown>;
          if (typeof record.severity === "string" && /error/i.test(record.severity)) {
            return true;
          }
          return Object.values(record).some((item) => diagnosticsContainError(item));
        }
        return false;
      };

      const getDetailedCompileError = async (initialError: unknown) => {
        const mainFilePath = createTempTypPath();
        await typstRef.current.addSource(mainFilePath, source);
        try {
          const compiler = await typstRef.current.getCompiler();
          const compiled = await compiler.compile({
            mainFilePath,
            format: "pdf",
            diagnostics: "unix",
          });
          if (compiled?.diagnostics && diagnosticsContainError(compiled.diagnostics)) {
            throw compiled.diagnostics;
          }
          throw initialError;
        } catch (detailedError) {
          throw detailedError;
        } finally {
          try {
            await typstRef.current.unmapShadow(mainFilePath);
          } catch {
            // no-op cleanup failure
          }
        }
      };

      const compilePdf = async () => {
        try {
          const pdf = await typstRef.current.pdf({ mainContent: source });
          return pdf as Uint8Array;
        } catch (initialError) {
          return getDetailedCompileError(initialError);
        }
      };

      // Use requestIdleCallback for non-blocking compilation
      if (typeof requestIdleCallback !== "undefined") {
        return new Promise((resolve, reject) => {
          requestIdleCallback(
            async (deadline) => {
              if (deadline.timeRemaining() > 50) {
                compilePdf().then(resolve).catch(reject);
              } else {
                setTimeout(() => {
                  compilePdf().then(resolve).catch(reject);
                }, 100);
              }
            },
            { timeout: 5000 }
          );
        });
      }

      // Fallback for browsers without requestIdleCallback
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          compilePdf().then(resolve).catch(reject);
        }, 50);
      });
    },
    []
  );

  useEffect(() => {
    const initTypst = async () => {
      try {
        const { $typst } = await import("@myriaddreamin/typst-all-in-one.ts");
        if ($typst.ready) {
          await $typst.ready;
        }

        typstRef.current = $typst;
        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize Typst globally:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize Typst"
        );
      } finally {
        setIsLoading(false);
      }
    };

    const start = () => {
      void initTypst();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      requestIdleCallback(start, { timeout: 1500 });
    } else {
      setTimeout(start, 0);
    }
  }, []);

  const value = {
    $typst: typstRef.current,
    isReady,
    error,
    isLoading,
    compileAsync,
  };

  return (
    <TypstContext.Provider value={value}>{children}</TypstContext.Provider>
  );
}

export function useTypstGlobal() {
  const context = useContext(TypstContext);
  if (context === undefined) {
    throw new Error("useTypstGlobal must be used within a TypstProvider");
  }
  return context;
}
