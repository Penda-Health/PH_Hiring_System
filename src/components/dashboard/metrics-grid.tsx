"use client";

import {
  Briefcase,
  AlertTriangle,
  Users,
  HandCoins,
  UserCheck,
  Timer,
  UserX,
  CheckCircle2,
  TrendingDown,
  ClipboardCheck,
  BadgeCheck,
  ShieldAlert,
  Scale,
  Share2,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { getAllMetrics, type MetricRow } from "@/lib/dashboard-metrics";
import { DashboardFilterState, filterDashboardData } from "@/lib/dashboard-filters";

const ICONS: Record<string, LucideIcon> = {
  "Open Roles": Briefcase,
  "HC Remaining": AlertTriangle,
  "Active Candidates": Users,
  "Offers Out": HandCoins,
  "Hired MTD": UserCheck,
  "Avg Time to Hire": Timer,
  "No-Show Rate": UserX,
  "Offer Acceptance Rate": CheckCircle2,
  "Post-Offer Drop Rate": TrendingDown,
  "Work Trial Pass Rate": ClipboardCheck,
  "3-Month Confirm Rate": BadgeCheck,
  "Hard-to-Fill Watch": ShieldAlert,
  "Recruiter Role Ratio": Scale,
  "Referral Hire Rate": Share2,
  "Pipeline Coverage Rate": ShieldCheck,
  "Locum & Reliever Coverage": Stethoscope,
};

function MetricCard({ metric }: { metric: MetricRow }) {
  const Icon = ICONS[metric.metric] ?? Briefcase;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{metric.metric}</CardTitle>
        <Icon className="h-4 w-4 text-penda-teal" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{metric.value}</p>
        <p className="text-xs text-muted-foreground mt-1">Target: {metric.target}</p>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({ filters }: { filters: DashboardFilterState }) {
  const { candidates, openRoles, offers, workTrials, interviews, relievers, locums } = useRecruitmentData();
  const filtered = filterDashboardData(
    { candidates, openRoles, offers, workTrials, interviews, relievers, locums },
    filters
  );
  const metrics = getAllMetrics(filtered);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.num} metric={metric} />
      ))}
    </div>
  );
}
