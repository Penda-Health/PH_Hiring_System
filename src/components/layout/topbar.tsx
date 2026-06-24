"use client";

import Link from "next/link";
import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { USER_ROLE_LABELS } from "@/types";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="flex items-center h-16 px-4 md:px-6 border-b border-white/50 dark:border-white/10 bg-white/65 dark:bg-white/[0.04] backdrop-blur-xl backdrop-saturate-150">
      <MobileNav />
      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle />
        <div className="text-right">
          <p className="text-sm font-medium leading-none">{user.name}</p>
          <p className="text-xs text-muted-foreground">{USER_ROLE_LABELS[user.role]}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Open profile menu" className="rounded-full">
              <Avatar>
                <AvatarFallback className="bg-penda-teal text-white">{initials(user.name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
