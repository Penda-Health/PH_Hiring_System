import { NavList } from "./nav-list";

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-white/50 dark:border-white/10 bg-white/65 dark:bg-white/[0.04] backdrop-blur-xl backdrop-saturate-150 h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
        <span className="text-xl font-semibold text-penda-teal">Penda✨</span>
        <span className="text-sm text-muted-foreground">Hiring</span>
      </div>
      <NavList />
    </aside>
  );
}
