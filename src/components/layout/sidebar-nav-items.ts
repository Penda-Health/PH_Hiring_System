import {
  LayoutDashboard,
  KanbanSquare,
  CalendarClock,
  Briefcase,
  FileText,
  ClipboardCheck,
  PhoneCall,
  HandCoins,
  Users,
  Settings,
  CalendarRange,
} from "lucide-react";
import { UserRoleName } from "@/types";

export const sidebarNavItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRoleName[];
  group?: string;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/interviews", label: "Interview Schedule", icon: CalendarClock },
  { href: "/roles", label: "Open Roles Register", icon: Briefcase },
  { href: "/requisitions", label: "Requisition Intake", icon: FileText },
  { href: "/work-trials", label: "Work Trials", icon: ClipboardCheck },
  { href: "/reference-checks", label: "Reference Checks", icon: PhoneCall },
  { href: "/offers", label: "Offer Tracker", icon: HandCoins },
  { href: "/pools", label: "Relievers & Locums", icon: Users },
  { href: "/ips-meeting", label: "IPS Meeting Board", icon: CalendarRange, group: "IPS" },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["recruitment_manager"] },
];
