import { Button } from "@/components/ui/button";
import { Grid3X3, List } from "lucide-react";
import React from "react";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

const ViewToggle = React.memo(({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center border rounded-md p-1">
      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className="h-8 px-3"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className="h-8 px-3"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
});

ViewToggle.displayName = "ViewToggle";
export default ViewToggle;
