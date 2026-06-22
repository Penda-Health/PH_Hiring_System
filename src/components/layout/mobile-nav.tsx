"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NavList } from "./nav-list";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetTitle className="px-6 h-16 flex items-center border-b border-border">
          <span className="text-xl font-semibold text-penda-teal">Penda✨</span>
          <span className="text-sm text-muted-foreground ml-2">Hiring</span>
        </SheetTitle>
        <NavList onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
