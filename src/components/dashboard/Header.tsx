import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Moon, Sun } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { SearchBar } from "./SearchBar";
import Link from "next/link";
import Logo from "@/components/Logo";

interface HeaderProps {
  user: User;
  theme: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

export function Header({
  user,
  theme,
  searchQuery,
  onSearchChange,
  onToggleTheme,
  onSignOut,
}: HeaderProps) {
  const getUserName = () => {
    return (
      user.user_metadata?.full_name ||
      (() => {
        const namePart = user.email?.split("@")[0];
        if (namePart) {
          return namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }
        return undefined;
      })() ||
      "User"
    );
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-14 items-center gap-4 px-4">
        <Link href="/" prefetch className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-semibold text-lg">Infocusp Resumes</span>
        </Link>

        <SearchBar value={searchQuery} onChange={onSearchChange} />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getUserName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {getUserName()}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
