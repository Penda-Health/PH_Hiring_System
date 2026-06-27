"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { sidebarNavItems } from "./sidebar-nav-items";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleItems = sidebarNavItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  let lastGroup: string | undefined;

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname?.startsWith(item.href);
        const showGroupLabel = item.group && item.group !== lastGroup;
        lastGroup = item.group;
        return (
          <div key={item.href}>
            {showGroupLabel && (
              <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.group}
              </p>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-penda-teal text-white"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
