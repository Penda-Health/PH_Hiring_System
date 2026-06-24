"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/lib/auth/auth-context";
import { RecruitmentDataProvider, useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { PacmanLoader } from "@/components/ui/pacman-loader";

function DataLoadingGate({ children }: { children: React.ReactNode }) {
  const { loading, error } = useRecruitmentData();
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <PacmanLoader label="Loading recruitment data" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-critical-fg">
        Failed to load data from Airtable: {error}
      </div>
    );
  }
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PacmanLoader />
      </div>
    );
  }

  return (
    <RecruitmentDataProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-penda-bg via-[#EAFBF6] to-[#DCF3EC] dark:from-[#0A1F1F] dark:via-[#0C1818] dark:to-[#091414]">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6">
            <DataLoadingGate>{children}</DataLoadingGate>
          </main>
        </div>
      </div>
    </RecruitmentDataProvider>
  );
}
