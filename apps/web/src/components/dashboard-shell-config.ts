import {
  Armchair,
  BarChart3,
  CalendarCheck,
  CreditCard,
  Database,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Store,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};

const navIconMap: Record<string, LucideIcon> = {
  "/owner/dashboard": LayoutDashboard,
  "/owner/students": Users,
  "/owner/seats": Armchair,
  "/owner/checkins": CalendarCheck,
  "/owner/payments": IndianRupee,
  "/owner/reports": BarChart3,
  "/owner/admissions": UserPlus,
  "/owner/expenses": Wallet,
  "/owner/marketing": Megaphone,
  "/owner/notifications": Send,
  "/owner/billing": CreditCard,
  "/owner/settings": SettingsIcon,
  "/student/dashboard": LayoutDashboard,
  "/student/seat": Armchair,
  "/student/payments": IndianRupee,
  "/student/notifications": Send,
  "/student/focus": BarChart3,
  "/superadmin/dashboard": LayoutDashboard,
  "/superadmin/libraries": Store,
  "/superadmin/marketplace": Megaphone,
  "/superadmin/data": Database,
  "/superadmin/reviews": ShieldCheck,
  "/superadmin/offers": Send,
  "/superadmin/plans": CreditCard,
  "/superadmin/payments": IndianRupee,
};

export function navIconFor(item: DashboardNavItem) {
  return navIconMap[item.href] ?? LayoutDashboard;
}

export function settingsPathForRole(role?: string, tab?: string) {
  if (role === "LIBRARY_OWNER") return `/owner/settings${tab ? `?tab=${tab}` : ""}`;
  if (role === "STUDENT") return "/student/dashboard";
  if (role === "SUPER_ADMIN") return "/superadmin/dashboard";
  return "/owner/login";
}

export function notificationsPathForRole(role?: string) {
  if (role === "LIBRARY_OWNER") return "/owner/notifications";
  if (role === "STUDENT") return "/student/notifications";
  if (role === "SUPER_ADMIN") return "/superadmin/dashboard";
  return "/owner/login";
}

export function loginPathForRole(role?: string) {
  if (role === "STUDENT") return "/student/login";
  if (role === "SUPER_ADMIN") return "/superadmin/login";
  return "/owner/login";
}
