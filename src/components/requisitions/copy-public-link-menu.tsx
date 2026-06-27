"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CopyPublicLinkMenu() {
  const [copied, setCopied] = React.useState<"so" | "ips" | null>(null);

  async function handleCopy(kind: "so" | "ips") {
    const url = `${window.location.origin}/requisition-request/${kind}`;
    await navigator.clipboard.writeText(url);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Link2 className="h-4 w-4 mr-1.5" />
          Copy public link
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleCopy("so")}>
          {copied === "so" ? <Check className="h-4 w-4 mr-2" /> : null}
          SO requisition link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopy("ips")}>
          {copied === "ips" ? <Check className="h-4 w-4 mr-2" /> : null}
          IPS gap link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
