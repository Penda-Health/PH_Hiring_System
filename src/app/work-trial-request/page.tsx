"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell, FormMessage } from "@/components/forms/form-shell";

type Branch = { id: string; name: string; city: string };

type IdentifyResult = {
  sessionToken: string;
  candidateName: string;
  isNew: boolean;
  alreadyScheduled: boolean;
  selectedBranchName: string | null;
  selectedDate: string | null;
};

function minMaxDate() {
  const min = new Date();
  min.setDate(min.getDate() + 3);
  const max = new Date();
  max.setDate(max.getDate() + 21);
  return { min: min.toISOString().slice(0, 10), max: max.toISOString().slice(0, 10) };
}

function isWeekend(dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function formatDateDisplay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function WorkTrialRequestForm() {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [step, setStep] = React.useState<"identify" | "schedule" | "done">("identify");

  // Identify step
  const [name, setName] = React.useState("");
  const [phoneLocal, setPhoneLocal] = React.useState(""); // 7XXXXXXXX
  const [email, setEmail] = React.useState("");
  const [identifying, setIdentifying] = React.useState(false);
  const [identifyError, setIdentifyError] = React.useState<string | null>(null);

  // Schedule step (populated after identify)
  const [sessionToken, setSessionToken] = React.useState("");
  const [candidateName, setCandidateName] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [dateError, setDateError] = React.useState<string | null>(null);
  const [scheduling, setScheduling] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);
  const [scheduledBranch, setScheduledBranch] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState("");

  // Load branches on mount
  React.useEffect(() => {
    fetch("/api/public/work-trial-request")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches ?? []))
      .catch(() => {/* branches stay empty — handled below */});
  }, []);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, ""); // digits only
    // Must start with 7, max 9 digits
    if (raw.length === 0) { setPhoneLocal(""); return; }
    if (raw[0] !== "7") return; // block other leading digits
    setPhoneLocal(raw.slice(0, 9));
  }

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setIdentifyError(null);
    if (phoneLocal.length !== 9) {
      setIdentifyError("Enter your 9-digit number starting with 7 (e.g. 712 345 678).");
      return;
    }
    setIdentifying(true);
    try {
      const res = await fetch("/api/public/work-trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "identify", name: name.trim(), phone: phoneLocal, email: email.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "server_error");

      const data = body as IdentifyResult;
      setCandidateName(data.candidateName || name.trim());
      setSessionToken(data.sessionToken);

      if (data.alreadyScheduled) {
        setScheduledBranch(data.selectedBranchName ?? "");
        setScheduledDate(data.selectedDate ?? "");
        setStep("done");
      } else {
        setStep("schedule");
      }
    } catch (err) {
      setIdentifyError(
        err instanceof Error && err.message === "server_error"
          ? "Something went wrong. Please try again or contact ta@penda.co.ke."
          : (err instanceof Error ? err.message : "Something went wrong.")
      );
    } finally {
      setIdentifying(false);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (isWeekend(date)) {
      setDateError("Please pick a weekday (Monday – Friday).");
      return;
    }
    setDateError(null);
    setScheduleError(null);
    setScheduling(true);
    try {
      const res = await fetch("/api/public/work-trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "schedule", sessionToken, branchId, date }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "server_error");

      setScheduledBranch(body.branchName ?? "");
      setScheduledDate(body.date ?? date);
      setStep("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setScheduleError(
        msg === "session_expired"
          ? "Your session expired. Please go back and re-enter your details."
          : msg === "weekend_date"
          ? "Please pick a weekday (Monday – Friday)."
          : "Something went wrong. Please try again."
      );
    } finally {
      setScheduling(false);
    }
  }

  const { min, max } = minMaxDate();

  // ── Identify step ────────────────────────────────────────────────────────────
  if (step === "identify") {
    return (
      <FormShell
        title="Work Trial Scheduling"
        subtitle="Enter your details below to confirm your work trial at Penda Health."
      >
        <form onSubmit={handleIdentify} className="space-y-5">
          <div className="rounded-lg border border-penda-teal-light/50 bg-penda-teal/5 p-3 text-sm text-foreground/80">
            A work trial is a short, paid opportunity to work alongside our team at one of our branches.
            It usually lasts a single day.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Wanjiru"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                +254
              </span>
              <Input
                id="phone"
                required
                inputMode="numeric"
                value={phoneLocal}
                onChange={handlePhoneChange}
                placeholder="712 345 678"
                className="rounded-l-none"
                maxLength={9}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your 9-digit number starting with 7 — e.g. <strong>712 345 678</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>

          {identifyError && (
            <p className="text-sm text-destructive">{identifyError}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-penda-teal hover:bg-penda-teal-dark"
            disabled={identifying || !name.trim() || phoneLocal.length !== 9 || !email.trim()}
          >
            {identifying ? "Looking up your record…" : "Continue"}
          </Button>
        </form>
      </FormShell>
    );
  }

  // ── Schedule step ─────────────────────────────────────────────────────────────
  if (step === "schedule") {
    return (
      <FormShell
        title="Choose your work trial"
        subtitle={`Hi ${candidateName}, please pick a branch and date below.`}
      >
        <form onSubmit={handleSchedule} className="space-y-6">
          <div className="space-y-2">
            <Label>Choose a branch</Label>
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No branches available right now. Contact{" "}
                <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBranchId(b.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      branchId === b.id
                        ? "border-penda-teal bg-penda-teal/5"
                        : "border-border hover:border-penda-teal/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{b.name}</p>
                    {b.city && <p className="text-xs text-muted-foreground mt-0.5">{b.city}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Preferred date</Label>
            <input
              id="date"
              type="date"
              required
              min={min}
              max={max}
              value={date}
              onChange={(e) => { setDate(e.target.value); setDateError(null); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {dateError && <p className="text-sm text-destructive">{dateError}</p>}
            <p className="text-xs text-muted-foreground">Weekdays only, 3–21 days from today.</p>
          </div>

          {scheduleError && <p className="text-sm text-destructive">{scheduleError}</p>}

          <Button
            type="submit"
            className="w-full bg-penda-teal hover:bg-penda-teal-dark"
            disabled={scheduling || !branchId || !date}
          >
            {scheduling ? "Confirming…" : "Confirm my work trial"}
          </Button>
        </form>
      </FormShell>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────────
  return (
    <FormShell title="You&apos;re all set!" subtitle={`Hi ${candidateName}`}>
      <FormMessage>
        <p>
          Your work trial is confirmed at{" "}
          <strong>{scheduledBranch}</strong>
          {scheduledDate && (
            <>
              {" "}on <strong>{formatDateDisplay(scheduledDate)}</strong>
            </>
          )}
          .
        </p>
        <p>
          Please arrive on time and bring a valid ID. If you need to make changes, contact{" "}
          <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a>.
        </p>
      </FormMessage>
    </FormShell>
  );
}

export default function WorkTrialRequestPage() {
  return <WorkTrialRequestForm />;
}
