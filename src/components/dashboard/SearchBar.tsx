import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isMac = navigator.userAgent.toLowerCase().includes("mac");
  const shortcutLabel = isMac ? "⌘ K" : "Ctrl K";

  return (
    <div className="flex-1 flex justify-center">
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          id="search-input"
          placeholder="Search documents..."
          className="pl-10 pr-16 bg-background/50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {shortcutLabel}
        </span>
      </div>
    </div>
  );
}
