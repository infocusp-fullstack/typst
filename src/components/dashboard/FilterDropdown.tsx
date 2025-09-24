"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterType } from "@/types";
import { User } from "@supabase/supabase-js";

interface FilterDropdownProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  user: User;
  isCXO: boolean;
  isDeptLeader: boolean;
}

export function FilterDropdown({
  filter,
  onFilterChange,
  isCXO,
  isDeptLeader,
}: FilterDropdownProps) {
  const filterOptions = [
    { value: "owned", label: "Owned by me" },
    { value: "shared", label: "Shared with me" },
    ...(isCXO ? [{ value: "all", label: "All resumes" }] : []),
    ...(isDeptLeader ? [{ value: "dept", label: "My Dept" }] : []),
  ];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filter}
        onValueChange={(value: FilterType) => onFilterChange(value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
