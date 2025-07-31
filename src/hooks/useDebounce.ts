import { useRef, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const timer = useRef<number>(0);

  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  return debouncedFn as T;
}
