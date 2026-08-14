"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AiAssistantLauncher } from "@/components/dashboard/ai-assistant-launcher";
import { useAuth } from "@/lib/auth/auth-context";
import { RecruitmentDataProvider, useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Spinner } from "@/components/ui/spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { UndoToastProvider } from "@/components/ui/undo-toast";

function DataLoadingGate({ children }: { children: React.ReactNode }) {
  const { loading, error, canEdit } = useRecruitmentData();
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner label="Loading recruitment data" />
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
  return (
    <>
      {!canEdit && (
        <div className="mb-4 rounded-md border border-penda-blue/30 bg-penda-blue-light/40 px-4 py-2 text-sm text-penda-blue-dark">
          View only — you can browse recruitment data, but only Recruitment Users and Managers can create or edit it.
        </div>
      )}
      {children}
    </>
  );
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
        <Spinner />
      </div>
    );
  }

  return (
    // UndoToastProvider wraps RecruitmentDataProvider (not the other way
    // round) so the delete callbacks defined inside RecruitmentDataProvider
    // can call useUndoToast() themselves — it needs to be an ancestor, not a
    // sibling. It also has to survive route navigation within the dashboard
    // for a pending delete's 30s window to keep counting down, which is true
    // here since both providers live above the routed `children`.
    <UndoToastProvider>
      <RecruitmentDataProvider>
        <div className="flex min-h-screen bg-gradient-to-br from-penda-bg via-[#EAEEFB] to-[#DCE2F3] dark:from-[#0A0F1F] dark:via-[#0C0F18] dark:to-[#090C14]">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Topbar />
            <main className="flex-1 p-4 md:p-6">
              <ErrorBoundary>
                <DataLoadingGate>{children}</DataLoadingGate>
              </ErrorBoundary>
            </main>
          </div>
          <AiAssistantLauncher />
        </div>
      </RecruitmentDataProvider>
    </UndoToastProvider>
  );
}
