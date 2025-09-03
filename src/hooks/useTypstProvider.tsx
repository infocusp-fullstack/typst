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
  compileSync: (source: string) => Promise<Uint8Array>;
}

const TypstContext = createContext<TypstContextType | undefined>(undefined);

export function TypstProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const typstRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Synchronous compilation for immediate results (blocks main thread)
  const compileSync = useCallback(
    async (source: string): Promise<Uint8Array> => {
      if (!typstRef.current) {
        throw new Error("Typst not initialized");
      }
      return await typstRef.current.pdf({ mainContent: source });
    },
    []
  );

  // Async compilation function that doesn't block the main thread
  const compileAsync = useCallback(
    async (source: string): Promise<Uint8Array> => {
      // Wait for Typst to be ready if it's not yet
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

      // Use requestIdleCallback for non-blocking compilation
      if (typeof requestIdleCallback !== "undefined") {
        return new Promise((resolve, reject) => {
          requestIdleCallback(
            async (deadline) => {
              try {
                if (deadline.timeRemaining() > 50) {
                  const pdf = await typstRef.current.pdf({
                    mainContent: source,
                  });
                  resolve(pdf);
                } else {
                  // Not enough time, use setTimeout
                  setTimeout(async () => {
                    try {
                      const pdf = await typstRef.current.pdf({
                        mainContent: source,
                      });
                      resolve(pdf);
                    } catch (err) {
                      reject(err);
                    }
                  }, 100);
                }
              } catch (err) {
                reject(err);
              }
            },
            { timeout: 5000 }
          );
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const pdf = await typstRef.current.pdf({ mainContent: source });
              resolve(pdf);
            } catch (err) {
              reject(err);
            }
          }, 50);
        });
      }
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

    initTypst();
  }, []);

  const value = {
    $typst: typstRef.current,
    isReady,
    error,
    isLoading,
    compileAsync,
    compileSync,
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
