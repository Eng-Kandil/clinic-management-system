import {
  Activity,
  LayoutDashboard,
  Calendar,
  Brain,
  Pill,
  MessageSquare,
  Droplets,
  CreditCard,
  Settings,
  Users,
  UserCog,
  BarChart3,
  Shield,
  ScrollText,
  UserCheck,
  UserPlus,
  Clock,
  Stethoscope,
  CalendarClock,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/auth/rbac";

// ---------------------------------------------------------------------------
// Role-based navigation registry
//
// Single source of truth shared by Sidebar.tsx and MobileNav.tsx. Each item
// declares the roles allowed to see it; consumers filter by the active
// session's role.
// ---------------------------------------------------------------------------

export interface NavItem {
  href: string;
  label: string;
  /** Lucide icon component reference. */
  icon: LucideIcon;
  /** Roles permitted to see this menu entry. */
  roles: Role[];
}

const ALL_DASHBOARD_USERS: Role[] = [
  "patient",
  "doctor",
  "admin",
  "security_officer",
];

export const NAV_ITEMS: NavItem[] = [
  // Generic dashboard landing for everyone except receptionist (who has a
  // dedicated sub-route).
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ALL_DASHBOARD_USERS,
  },
  {
    href: "/dashboard/receptionist",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["receptionist"],
  },

  // Admin
  {
    href: "/dashboard/admin/users",
    label: "User Management",
    icon: UserCog,
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/doctors",
    label: "Doctors & Pricing",
    icon: Stethoscope,
    roles: ["admin"],
  },

  // Appointments
  {
    href: "/dashboard/appointments",
    label: "Appointments",
    icon: Calendar,
    roles: ["patient", "doctor", "admin"],
  },
  {
    href: "/dashboard/appointments",
    label: "Today's Schedule",
    icon: Calendar,
    roles: ["receptionist"],
  },

  // Patients
  {
    href: "/dashboard/patients",
    label: "Patients",
    icon: Users,
    roles: ["doctor", "admin"],
  },

  // Doctor self-service
  {
    href: "/dashboard/availability",
    label: "My Availability",
    icon: CalendarClock,
    roles: ["doctor"],
  },

  // Clinical
  {
    href: "/dashboard/ai-diagnosis",
    label: "AI Diagnosis",
    icon: Brain,
    roles: ["patient", "doctor"],
  },
  {
    href: "/dashboard/treatment-tracking",
    label: "Treatment Tracking",
    icon: Pill,
    roles: ["patient", "doctor"],
  },
  {
    href: "/dashboard/consultations",
    label: "Consultations",
    icon: MessageSquare,
    roles: ["patient", "doctor"],
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    icon: Send,
    roles: ["patient"],
  },
  {
    href: "/dashboard/blood-bridge",
    label: "Blood Bridge",
    icon: Droplets,
    roles: ["patient", "doctor"],
  },

  // Receptionist workflow
  {
    href: "/dashboard/receptionist/check-in",
    label: "Patient Check-In",
    icon: UserCheck,
    roles: ["receptionist"],
  },
  {
    href: "/dashboard/receptionist/walk-in",
    label: "Walk-in Registration",
    icon: UserPlus,
    roles: ["receptionist"],
  },
  {
    href: "/dashboard/receptionist/queue",
    label: "Waiting Queue",
    icon: Clock,
    roles: ["receptionist"],
  },

  // Billing
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: CreditCard,
    roles: ["patient"],
  },

  // Admin analytics
  {
    href: "/dashboard/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin"],
  },

  // Security
  {
    href: "/dashboard/security",
    label: "Security",
    icon: Shield,
    roles: ["admin"],
  },
  {
    href: "/dashboard/security",
    label: "Security Dashboard",
    icon: Shield,
    roles: ["security_officer"],
  },
  {
    href: "/dashboard/security/audit-log",
    label: "Audit Logs",
    icon: ScrollText,
    roles: ["admin", "security_officer"],
  },

  // Settings — every role except receptionist (matches original menus).
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    roles: ["patient", "doctor", "admin", "security_officer"],
  },
];

/**
 * Returns the menu items visible for the given role, in declaration order.
 * Falls back to the patient menu when role is unknown.
 */
export function getNavItemsForRole(role: Role | string | undefined): NavItem[] {
  const r = (role ?? "patient") as Role;
  const filtered = NAV_ITEMS.filter((item) => item.roles.includes(r));
  if (filtered.length > 0) return filtered;
  return NAV_ITEMS.filter((item) => item.roles.includes("patient"));
}

// Re-export the brand icon so layouts can keep a single import surface.
export { Activity as BrandIcon };
