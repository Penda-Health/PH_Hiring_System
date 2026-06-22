"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    router.push(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
}
