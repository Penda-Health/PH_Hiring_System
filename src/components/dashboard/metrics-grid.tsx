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
import { KpiStrip, type KpiTileData } from "@/components/dashboard/kpi-strip";
import { type MetricRow } from "@/lib/dashboard-metrics";

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
  "6-Month Confirm Rate": BadgeCheck,
  "Hard-to-Fill Watch": ShieldAlert,
  "Recruiter Role Ratio": Scale,
  "Referral Hire Rate": Share2,
  "Pipeline Coverage Rate": ShieldCheck,
  "Locum & Reliever Coverage": Stethoscope,
};

const ACCENTS: Record<string, KpiTileData["accent"]> = {
  "Open Roles": "teal",
  "HC Remaining": "amber",
  "Active Candidates": "blue",
  "Offers Out": "blue",
  "Hired MTD": "teal",
  "Avg Time to Hire": "amber",
  "No-Show Rate": "rose",
  "Offer Acceptance Rate": "teal",
  "Post-Offer Drop Rate": "rose",
  "Work Trial Pass Rate": "teal",
  "6-Month Confirm Rate": "teal",
  "Hard-to-Fill Watch": "rose",
  "Recruiter Role Ratio": "blue",
  "Referral Hire Rate": "blue",
  "Pipeline Coverage Rate": "amber",
  "Locum & Reliever Coverage": "amber",
};

/** Pulls a named subset of metrics out of getAllMetrics() and shapes them for KpiStrip, preserving the requested order. */
export function buildKpiTiles(metrics: MetricRow[], names: string[]): KpiTileData[] {
  const byName = new Map(metrics.map((m) => [m.metric, m]));
  return names
    .map((name) => byName.get(name))
    .filter((m): m is MetricRow => !!m)
    .map((m) => ({
      label: m.metric,
      value: m.value,
      sublabel: `Target: ${m.target}`,
      icon: ICONS[m.metric] ?? Briefcase,
      accent: ACCENTS[m.metric] ?? "teal",
    }));
}

export function getMetricValue(metrics: MetricRow[], name: string): number {
  const metric = metrics.find((m) => m.metric === name);
  if (!metric) return 0;
  return parseFloat(metric.value) || 0;
}

export const OVERVIEW_METRIC_NAMES = [
  "Open Roles",
  "HC Remaining",
  "Active Candidates",
  "Offers Out",
  "Hired MTD",
  "Avg Time to Hire",
];

export const DETAIL_METRIC_NAMES = [
  "Post-Offer Drop Rate",
  "Work Trial Pass Rate",
  "6-Month Confirm Rate",
  "Hard-to-Fill Watch",
  "Recruiter Role Ratio",
  "Referral Hire Rate",
  "Pipeline Coverage Rate",
  "Locum & Reliever Coverage",
];

export function MetricsGrid({
  metrics,
  names,
  columns,
}: {
  metrics: MetricRow[];
  names: string[];
  columns?: 3 | 4;
}) {
  return <KpiStrip tiles={buildKpiTiles(metrics, names)} columns={columns} />;
}
