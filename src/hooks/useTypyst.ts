import { useState, useEffect } from "react";
import { $typst } from "@myriaddreamin/typst-all-in-one.ts";

export function useTypst() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initTypst = async () => {
      try {
        if ($typst.ready) {
          await $typst.ready;
        }
        setIsReady(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize Typst",
        );
      }
    };

    initTypst();
  }, []);

  return { $typst, isReady, error };
}
