import {
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  FileText,
  ClipboardCheck,
  PhoneCall,
  HandCoins,
  Users,
  Settings,
  CalendarRange,
  TrendingUp,
  Gauge,
} from "lucide-react";
import { UserRoleName } from "@/types";

export const sidebarNavItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRoleName[];
  group?: string;
  /**
   * Parked: left out of the menu for now (not deleted) while the dashboard is
   * opened up to RMs, BMs and other stakeholders. The page still works if
   * opened directly. Flip back to show it once it's built out.
   */
  hidden?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  // Candidate details (contacts, notes) are for the recruitment team only —
  // enforced server-side too via ROLE_ROUTES in src/lib/permissions.ts.
  { href: "/candidates", label: "Candidates", icon: Users, roles: ["recruitment_user", "recruitment_manager"] },
  { href: "/roles", label: "Open Roles Register", icon: Briefcase },
  { href: "/requisitions", label: "Requisition Intake", icon: FileText },
  { href: "/work-trials", label: "Work Trials", icon: ClipboardCheck },
  { href: "/reference-checks", label: "Reference Checks", icon: PhoneCall },
  { href: "/offers", label: "Offer Tracker", icon: HandCoins },
  { href: "/pools", label: "Relievers & Locums", icon: Users, hidden: true },
  { href: "/expansion", label: "Expansion Tracker", icon: TrendingUp, group: "Expansion", hidden: true },
  { href: "/ips-meeting", label: "IPS Meeting Board", icon: CalendarRange, group: "IPS", hidden: true },
  { href: "/staffing", label: "Staffing Projections", icon: Gauge, group: "IPS" },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["recruitment_manager"] },
];
