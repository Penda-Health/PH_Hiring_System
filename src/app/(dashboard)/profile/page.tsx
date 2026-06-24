"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateOwnProfile } from "@/lib/supabase/profiles";
import { getPendingTasks, SEVERITY_STYLES } from "@/lib/dashboard/pending-tasks";
import { DashboardDefaultView, EmailNotificationPreference, USER_ROLE_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const DASHBOARD_VIEWS: { value: DashboardDefaultView; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "pipeline", label: "Pipeline" },
  { value: "requisitions", label: "Requisition Intake" },
  { value: "work-trials", label: "Work Trials" },
  { value: "offers", label: "Offer Tracker" },
];

const EMAIL_PREFS: { value: EmailNotificationPreference; label: string }[] = [
  { value: "all", label: "All notifications" },
  { value: "urgent", label: "Urgent only" },
  { value: "none", label: "None" },
];

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { workTrials, offers, referenceChecks, interviews, candidates, openRoles } = useRecruitmentData();

  const [displayName, setDisplayName] = React.useState(user?.name ?? "");
  const [jobTitle, setJobTitle] = React.useState(user?.jobTitle ?? "");
  const [phone, setPhone] = React.useState(user?.phone ?? "");
  const [dashboardDefault, setDashboardDefault] = React.useState<DashboardDefaultView>(user?.dashboardDefault ?? "dashboard");
  const [emailNotifications, setEmailNotifications] = React.useState<EmailNotificationPreference>(
    user?.emailNotifications ?? "all"
  );
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  if (!user) return null;

  const pendingTasks = getPendingTasks(user, { workTrials, offers, referenceChecks, interviews, candidates, openRoles });

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSaveError("Supabase isn't configured yet — profile edits aren't persisted in this environment.");
      setSaving(false);
      return;
    }
    const result = await updateOwnProfile(supabase, user.id, {
      displayName,
      jobTitle,
      phone,
      dashboardDefault,
      emailNotifications,
    });
    if (!result.ok) {
      setSaveError(result.error ?? "Something went wrong saving your profile.");
    } else {
      setSaved(true);
      await refreshProfile();
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-penda-teal text-white text-xl">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-lg font-semibold leading-none">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="outline">{USER_ROLE_LABELS[user.role]}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Recruiter" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email (read only)</Label>
              <Input value={user.email} disabled />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Default dashboard view</Label>
              <Select value={dashboardDefault} onValueChange={(v) => setDashboardDefault(v as DashboardDefaultView)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_VIEWS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email notifications</Label>
              <Select value={emailNotifications} onValueChange={(v) => setEmailNotifications(v as EmailNotificationPreference)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_PREFS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>System role (read only)</Label>
            <Input value={USER_ROLE_LABELS[user.role]} disabled />
            <p className="text-xs text-muted-foreground">
              Only a Recruitment Manager can change your role, from Settings &gt; Users.
            </p>
          </div>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {saved && <p className="text-sm text-penda-teal-dark">Saved.</p>}

          <Button onClick={handleSave} disabled={saving} className="bg-penda-teal hover:bg-penda-teal-dark">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
          ) : (
            pendingTasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium leading-tight">{task.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{task.detail}</p>
                </div>
                <Badge className={SEVERITY_STYLES[task.severity]}>{task.severity.replace("-", " ")}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
