import {
  Armchair,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Database,
  IndianRupee,
  LayoutDashboard,
  Megaphone,
  PanelsTopLeft,
  QrCode,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Store,
  Tags,
  UserRound,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  group?: string;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export function groupNavItems(nav: DashboardNavItem[]) {
  return nav.reduce<DashboardNavGroup[]>((groups, item) => {
    const label = item.group ?? "Workspace";
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
    return groups;
  }, []);
}

const navIconMap: Record<string, LucideIcon> = {
  "/owner/dashboard": LayoutDashboard,
  "/owner/listing": Store,
  "/owner/plans": CreditCard,
  "/owner/coupons": Tags,
  "/owner/students": Users,
  "/owner/seats": Armchair,
  "/owner/checkins": CalendarCheck,
  "/owner/payments": IndianRupee,
  "/owner/reports": BarChart3,
  "/owner/admissions": UserPlus,
  "/owner/expenses": Wallet,
  "/owner/marketing": Megaphone,
  "/owner/referrals": UserPlus,
  "/owner/website": PanelsTopLeft,
  "/owner/notifications": Send,
  "/owner/billing": CreditCard,
  "/owner/admins": UserRound,
  "/owner/settings": SettingsIcon,
  "/student/dashboard": LayoutDashboard,
  "/student/seat": Armchair,
  "/student/payments": IndianRupee,
  "/student/notifications": Send,
  "/student/focus": BarChart3,
  "/student/tools": PanelsTopLeft,
  "/student/scanner": QrCode,
  "/student/syllabus": Database,
  "/student/revisions": CalendarCheck,
  "/student/rewards": ShieldCheck,
  "/student/referrals": UserPlus,
  "/student/feed": Send,
  "/student/offers": Tags,
  "/student/settings": UserRound,
  "/superadmin/dashboard": LayoutDashboard,
  "/superadmin/libraries": Store,
  "/superadmin/marketplace": Megaphone,
  "/superadmin/data": Database,
  "/superadmin/syllabus": Database,
  "/superadmin/book-requests": BookOpen,
  "/superadmin/reviews": ShieldCheck,
  "/superadmin/offers": Send,
  "/superadmin/plans": CreditCard,
  "/superadmin/integrations": SettingsIcon,
  "/superadmin/referrals": UserPlus,
  "/superadmin/payments": IndianRupee,
};

export function navIconFor(item: DashboardNavItem) {
  return navIconMap[item.href] ?? LayoutDashboard;
}

export function settingsPathForRole(role?: string, tab?: string) {
  if (role === "LIBRARY_OWNER") return `/owner/settings${tab ? `?tab=${tab}` : ""}`;
  if (role === "STUDENT") return `/student/settings${tab ? `?tab=${tab}` : ""}`;
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
