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
} from "lucide-react";

export const sidebarNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/interviews", label: "Interview Schedule", icon: CalendarClock },
  { href: "/roles", label: "Open Roles Register", icon: Briefcase },
  { href: "/requisitions", label: "Requisition Intake", icon: FileText },
  { href: "/work-trials", label: "Work Trials", icon: ClipboardCheck },
  { href: "/reference-checks", label: "Reference Checks", icon: PhoneCall },
  { href: "/offers", label: "Offer Tracker", icon: HandCoins },
  { href: "/pools", label: "Relievers & Locums", icon: Users },
];
