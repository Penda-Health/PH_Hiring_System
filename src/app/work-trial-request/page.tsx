"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell, FormMessage, type FormShellBrand } from "@/components/forms/form-shell";
import { DatePickerCalendar } from "@/components/forms/date-picker-calendar";
import { MapPin, Phone, Calendar, CheckCircle2 } from "lucide-react";

const BRAND: FormShellBrand = {
  headline: "You're one step from your work trial.",
  lede: "Pick a branch and a day that works — we'll have your supervisor and paperwork ready when you arrive.",
  stats: [
    { value: "9–5", label: "Full day, on-site" },
    { value: "2 wks", label: "Days out to pick from" },
  ],
  footer: "Questions? careers@pendahealth.com",
};

type Branch = {
  id: string;
  name: string;
  city: string;
  address?: string;
  mapPinUrl?: string;
  bmName?: string;
  bmPhone?: string;
};

type SpecialtyConfig = {
  id: string;
  specialty: string;
  displayName: string;
  branchIds: string[];
  availableDays: string[];
  active: boolean;
};

// Day name → JS day number (0=Sun…6=Sat)
const DAY_NAME_TO_NUM: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

type IdentifyResult = {
  sessionToken: string;
  candidateName: string;
  isNew: boolean;
  alreadyScheduled: boolean;
  selectedBranchName: string | null;
  selectedDate: string | null;
  selectedBranchAddress: string | null;
  selectedMapPinUrl: string | null;
  selectedBmName: string | null;
  selectedBmPhone: string | null;
};

type ScheduleResult = {
  ok: boolean;
  branchName: string;
  branchAddress: string;
  mapPinUrl: string;
  bmName: string;
  bmPhone: string;
  date: string;
};

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
  const [specialtyConfigs, setSpecialtyConfigs] = React.useState<SpecialtyConfig[]>([]);
  const [step, setStep] = React.useState<"identify" | "role" | "schedule" | "done">("identify");

  // Identify step
  const [name, setName] = React.useState("");
  const [phoneLocal, setPhoneLocal] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [identifying, setIdentifying] = React.useState(false);
  const [identifyError, setIdentifyError] = React.useState<string | null>(null);

  // Role step
  const [roleCategory, setRoleCategory] = React.useState<"General" | "Specialist" | "">("");
  const [selectedSpecialty, setSelectedSpecialty] = React.useState("");

  // Schedule step
  const [sessionToken, setSessionToken] = React.useState("");
  const [candidateName, setCandidateName] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [scheduling, setScheduling] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);

  // Confirmation data
  const [confirmedBranchName, setConfirmedBranchName] = React.useState("");
  const [confirmedBranchAddress, setConfirmedBranchAddress] = React.useState("");
  const [confirmedMapPinUrl, setConfirmedMapPinUrl] = React.useState("");
  const [confirmedBmName, setConfirmedBmName] = React.useState("");
  const [confirmedBmPhone, setConfirmedBmPhone] = React.useState("");
  const [confirmedDate, setConfirmedDate] = React.useState("");

  // Earliest selectable date: tomorrow
  const minDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Latest: 2 weeks out
  const maxDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  }, []);

  React.useEffect(() => {
    fetch("/api/public/work-trial-request")
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.branches ?? []);
        setSpecialtyConfigs((d.specialtyConfigs ?? []).filter((s: SpecialtyConfig) => s.active));
      })
      .catch(() => {});
  }, []);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length === 0) { setPhoneLocal(""); return; }
    if (raw[0] !== "7") return;
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
        setConfirmedBranchName(data.selectedBranchName ?? "");
        setConfirmedBranchAddress(data.selectedBranchAddress ?? "");
        setConfirmedMapPinUrl(data.selectedMapPinUrl ?? "");
        setConfirmedBmName(data.selectedBmName ?? "");
        setConfirmedBmPhone(data.selectedBmPhone ?? "");
        setConfirmedDate(data.selectedDate ?? "");
        setStep("done");
      } else {
        // Go to role selection; skip it if no active specialties configured
        setStep(specialtyConfigs.length > 0 ? "role" : "schedule");
      }
    } catch (err) {
      setIdentifyError(
        err instanceof Error && err.message === "server_error"
          ? "Something went wrong. Please try again or contact careers@pendahealth.com."
          : (err instanceof Error ? err.message : "Something went wrong.")
      );
    } finally {
      setIdentifying(false);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError(null);
    setScheduling(true);
    try {
      const res = await fetch("/api/public/work-trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "schedule",
          sessionToken,
          branchId,
          date,
          ...(roleCategory ? { roleCategory } : {}),
          ...(roleCategory === "Specialist" && selectedSpecialty ? { specialty: selectedSpecialty } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "server_error");

      const data = body as ScheduleResult;
      setConfirmedBranchName(data.branchName ?? "");
      setConfirmedBranchAddress(data.branchAddress ?? "");
      setConfirmedMapPinUrl(data.mapPinUrl ?? "");
      setConfirmedBmName(data.bmName ?? "");
      setConfirmedBmPhone(data.bmPhone ?? "");
      setConfirmedDate(data.date ?? date);
      setStep("done");
    } catch (err) {
      const bodyErr = err instanceof Error ? err.message : "";
      setScheduleError(
        bodyErr === "session_expired"
          ? "Your session expired. Please go back and re-enter your details."
          : bodyErr === "sunday_date"
          ? "Sundays are not available. Please pick a different day."
          : bodyErr === "invalid_branch_for_specialty"
          ? `That branch doesn't offer ${selectedSpecialty || "specialist"} work trials. Please select a different branch.`
          : bodyErr === "invalid_day_for_specialty"
          ? `That day is not available for ${selectedSpecialty || "specialist"} work trials. Please pick another date.`
          : "Something went wrong. Please try again."
      );
    } finally {
      setScheduling(false);
    }
  }

  // ── Derived: filtered branches + allowed days based on specialty ──────────
  const activeSpecialtyConfig = React.useMemo(
    () => (roleCategory === "Specialist" && selectedSpecialty
      ? specialtyConfigs.find((s) => s.specialty === selectedSpecialty) ?? null
      : null),
    [roleCategory, selectedSpecialty, specialtyConfigs]
  );

  const filteredBranches = React.useMemo(
    () => (activeSpecialtyConfig && activeSpecialtyConfig.branchIds.length > 0
      ? branches.filter((b) => activeSpecialtyConfig.branchIds.includes(b.id))
      : branches),
    [activeSpecialtyConfig, branches]
  );

  const allowedDayNumbers = React.useMemo<number[] | undefined>(
    () => (activeSpecialtyConfig && activeSpecialtyConfig.availableDays.length > 0
      ? activeSpecialtyConfig.availableDays
          .map((d) => DAY_NAME_TO_NUM[d])
          .filter((n): n is number => n !== undefined)
      : undefined),
    [activeSpecialtyConfig]
  );

  const allowedDaysLabel = React.useMemo(() => {
    if (!allowedDayNumbers) return "Weekdays only · Mon – Sat available";
    const names = (activeSpecialtyConfig?.availableDays ?? []).join(", ");
    return `Available days: ${names}`;
  }, [allowedDayNumbers, activeSpecialtyConfig]);

  // ── Identify step ─────────────────────────────────────────────────────────
  if (step === "identify") {
    return (
      <FormShell brand={BRAND}
        title="Work Trial Scheduling"
        subtitle="Enter your details below to confirm your work trial at Penda Health."
      >
        <form onSubmit={handleIdentify} className="space-y-5">
          <div className="rounded-lg border border-penda-blue-light/50 bg-penda-blue/5 p-4 text-sm text-foreground/80 space-y-2.5">
            <p className="font-medium text-foreground">Congratulations on making it to the work trial stage!</p>
            <p>
              A work trial is a full-day opportunity to work alongside our team at one of our branches, from
              9:00 AM – 5:00 PM. Please ensure you&apos;re available for the entire day.
            </p>
            <p>
              As part of our benefits, we reimburse <span className="font-medium text-foreground">KES 1,000</span>{" "}
              post-onboarding for any work trial attended, to cover transport, lunch, and other costs associated
              with the day.
            </p>
            <p className="border-t border-penda-blue-light/40 pt-2.5">
              <span className="font-medium text-foreground">What to expect: </span>
              It runs much like a normal working day, but with added exposure to the Penda Way, our systems, our
              patients, and interactions with other teams and departments. The Branch Manager/Incharge will be
              with you throughout the day to guide you.
            </p>
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
            className="w-full bg-penda-blue hover:bg-penda-blue-dark"
            disabled={identifying || !name.trim() || phoneLocal.length !== 9 || !email.trim()}
          >
            {identifying ? "Looking up your record…" : "Continue"}
          </Button>
        </form>
      </FormShell>
    );
  }

  // ── Role selection step ───────────────────────────────────────────────────
  if (step === "role") {
    const canContinue =
      roleCategory === "General" ||
      (roleCategory === "Specialist" && selectedSpecialty !== "");

    return (
      <FormShell brand={BRAND}
        title="What role are you applying for?"
        subtitle={`Hi ${candidateName}, please let us know the type of role so we can assign the right branch and schedule.`}
      >
        <div className="space-y-5">
          {/* General vs Specialist */}
          <div className="space-y-2">
            <Label>Role type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["General", "Specialist"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setRoleCategory(cat);
                    if (cat === "General") setSelectedSpecialty("");
                  }}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    roleCategory === cat
                      ? "border-penda-blue bg-penda-blue/5 ring-1 ring-penda-blue/30"
                      : "border-border hover:border-penda-blue/50"
                  }`}
                >
                  <p className="font-semibold text-sm">
                    {cat === "General" ? "General Clinical Role" : "Specialist Service"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat === "General"
                      ? "Clinical Officer, Nurse, Receptionist, etc."
                      : "Dental, Sonographer, Reproductive Health, Pharmacy, Lab, etc."}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Specialty picker — only when Specialist selected */}
          {roleCategory === "Specialist" && (
            <div className="space-y-2">
              <Label>Select your specialist area</Label>
              {specialtyConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No specialist work trials are currently available. Contact{" "}
                  <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
                    careers@pendahealth.com
                  </a>{" "}
                  for assistance.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {specialtyConfigs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSpecialty(s.specialty)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        selectedSpecialty === s.specialty
                          ? "border-penda-blue bg-penda-blue/5 ring-1 ring-penda-blue/30"
                          : "border-border hover:border-penda-blue/50"
                      }`}
                    >
                      <p className="font-medium text-sm">{s.displayName}</p>
                      {s.availableDays.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.availableDays.join(", ")}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            className="w-full bg-penda-blue hover:bg-penda-blue-dark"
            disabled={!canContinue}
            onClick={() => {
              // Clear any previously selected branch/date since they may not
              // apply to the new specialty filter
              setBranchId("");
              setDate("");
              setStep("schedule");
            }}
          >
            Continue
          </Button>
        </div>
      </FormShell>
    );
  }

  // ── Schedule step ─────────────────────────────────────────────────────────
  if (step === "schedule") {
    const selectedBranch = filteredBranches.find((b) => b.id === branchId);

    return (
      <FormShell brand={BRAND}
        title="Choose your work trial"
        subtitle={`Hi ${candidateName}, please pick a branch and date below.`}
      >
        <form onSubmit={handleSchedule} className="space-y-6">
          {/* Specialty badge */}
          {roleCategory && (
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                roleCategory === "Specialist"
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
              }`}>
                {roleCategory === "Specialist" && selectedSpecialty
                  ? `Specialist · ${selectedSpecialty}`
                  : "General Clinical Role"}
              </span>
              <button
                type="button"
                className="text-muted-foreground underline text-xs"
                onClick={() => setStep("role")}
              >
                Change
              </button>
            </div>
          )}

          {/* Branch selector */}
          <div className="space-y-2">
            <Label>Choose a branch</Label>
            {filteredBranches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No branches available right now. Contact{" "}
                <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBranches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBranchId(b.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      branchId === b.id
                        ? "border-penda-blue bg-penda-blue/5 ring-1 ring-penda-blue/30"
                        : "border-border hover:border-penda-blue/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{b.name}</p>
                    {b.city && <p className="text-xs text-muted-foreground mt-0.5">{b.city}</p>}
                    {branchId === b.id && b.address && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-penda-blue" />
                        {b.address}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Full-day notice */}
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200 space-y-0.5">
            <p className="font-semibold">This is a full-day event</p>
            <p>The work trial runs from <strong>9:00 AM to 5:00 PM</strong>. Please only book a date on which you are available for the entire day.</p>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label>Preferred date</Label>
            <DatePickerCalendar
              value={date}
              onChange={setDate}
              minDate={minDate}
              maxDate={maxDate}
              allowedDays={allowedDayNumbers}
              allowedDaysLabel={allowedDaysLabel}
              placeholder="Select a date"
            />
            <p className="text-xs text-muted-foreground">
              {allowedDayNumbers
                ? `Available: ${activeSpecialtyConfig?.availableDays.join(", ") ?? "selected days"} · up to 2 weeks ahead`
                : "Available from tomorrow · Monday – Saturday · up to 2 weeks ahead"}
            </p>
          </div>

          {/* Branch + date preview */}
          {selectedBranch && date && (
            <div className="rounded-lg border border-penda-blue/30 bg-penda-blue/5 p-3 text-sm space-y-1">
              <p className="font-medium text-penda-blue">Your selection</p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-penda-blue" />
                {selectedBranch.name}{selectedBranch.city ? `, ${selectedBranch.city}` : ""}
              </p>
              <p className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-penda-blue" />
                {formatDateDisplay(date)}
              </p>
            </div>
          )}

          {scheduleError && <p className="text-sm text-destructive">{scheduleError}</p>}

          <Button
            type="submit"
            className="w-full bg-penda-blue hover:bg-penda-blue-dark"
            disabled={scheduling || !branchId || !date}
          >
            {scheduling ? "Confirming…" : "Confirm my work trial"}
          </Button>
        </form>
      </FormShell>
    );
  }

  // ── Confirmation ──────────────────────────────────────────────────────────
  return (
    <FormShell brand={BRAND} title="You're confirmed!" subtitle={`Great news, ${candidateName}`}>
      <div className="space-y-4">
        {/* Tick + date hero */}
        <div className="flex flex-col items-center gap-2 py-4">
          <CheckCircle2 className="h-14 w-14 text-penda-blue" />
          {confirmedDate && (
            <p className="text-lg font-semibold text-center">{formatDateDisplay(confirmedDate)}</p>
          )}
          <p className="text-sm font-medium text-penda-blue">9:00 AM – 5:00 PM (Full day)</p>
        </div>

        {/* Branch card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <p className="font-semibold">{confirmedBranchName}</p>
            {confirmedBranchAddress && (
              <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{confirmedBranchAddress}</p>
            )}
          </div>

          {confirmedMapPinUrl && (
            <a
              href={confirmedMapPinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 font-medium transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Open in Google Maps
            </a>
          )}

          {confirmedBmName && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Your supervisor</p>
              <p className="text-sm font-medium">{confirmedBmName}</p>
              {confirmedBmPhone && (
                <a
                  href={`tel:${confirmedBmPhone}`}
                  className="inline-flex items-center gap-1 text-sm text-penda-blue mt-0.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {confirmedBmPhone}
                </a>
              )}
            </div>
          )}
        </div>

        <FormMessage>
          <ul className="space-y-1.5 text-sm">
            <li><strong>The work trial runs from 9:00 AM to 5:00 PM.</strong> Please plan to be available for the entire day.</li>
            <li>Arrive by <strong>9:00 AM sharp</strong> — punctuality is taken into account during the assessment.</li>
            <li>Bring a valid national ID or passport.</li>
            <li>Dress professionally and bring a pen.</li>
            <li>A confirmation email has been sent to you with these details.</li>
          </ul>
          <p className="text-sm mt-2">
            Need to make changes? Contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>.
          </p>
        </FormMessage>
      </div>
    </FormShell>
  );
}

export default function WorkTrialRequestPage() {
  return <WorkTrialRequestForm />;
}
