"use client";

// Preview-before-download page for a reference check's PDF report. Reached
// from ReferenceCheckCard's "Preview report" button instead of downloading
// straight away, so a TA can sanity-check the report — including a partial
// one, generated from whichever referees have responded so far — before
// deciding whether it's ready to save/share.
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { getCandidateForRefCheck, STATUS_STYLES } from "@/lib/reference-check-helpers";

export default function ReferenceCheckReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { referenceChecks, candidates, extendedLoading } = useRecruitmentData();

  const refCheck = referenceChecks.find((c) => c.id === id);
  const candidate = refCheck ? getCandidateForRefCheck(refCheck, candidates) : undefined;

  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [filename, setFilename] = React.useState<string>("Reference Check Report.pdf");
  const [fetching, setFetching] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setFetching(true);
      setError(null);
      try {
        const res = await fetch(`/api/reference-checks/${id}/report`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error === "not_complete" ? "No referee has responded yet." : "Failed to generate report.");
        }
        const blob = await res.blob();
        if (cancelled) return;
        const disposition = res.headers.get("content-disposition") ?? "";
        const name = disposition.match(/filename="(.+)"/)?.[1];
        if (name) setFilename(name);
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to generate report.");
      } finally {
        if (!cancelled) setFetching(false);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => router.push("/reference-checks")} title="Back to Reference Checks">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {candidate?.name ?? (extendedLoading ? "Loading…" : "Reference check report")}
            </h1>
            {refCheck && <p className="text-xs text-muted-foreground">{refCheck.refId}</p>}
          </div>
          {refCheck && <Badge className={STATUS_STYLES[refCheck.status]}>{refCheck.status}</Badge>}
        </div>
        <Button size="sm" onClick={handleDownload} disabled={!pdfUrl} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
        {fetching || (extendedLoading && !refCheck) ? (
          <Spinner label="Preparing report…" />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <FileWarning className="h-6 w-6 text-critical-fg" />
            <p className="text-critical-fg">{error}</p>
          </div>
        ) : pdfUrl ? (
          <iframe src={pdfUrl} title="Reference check report preview" className="h-full w-full rounded-lg" />
        ) : (
          <p className="text-sm text-muted-foreground">Reference check not found.</p>
        )}
      </div>
    </div>
  );
}
