"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
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
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-penda-teal text-white">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
