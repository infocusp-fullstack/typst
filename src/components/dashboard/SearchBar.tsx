import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  // Handle Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById(
          "search-input",
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

  return (
    <div className="flex-1 flex justify-center">
      <div className="relative max-w-md w-full">
        <Search className="rounded absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          id="search-input"
          placeholder="Search documents..."
          className="pl-10 pr-24 bg-background/50 supports-[backdrop-filter]:bg-background/50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {shortcutLabel}
        </span>
      </div>
    </div>
  );
}
