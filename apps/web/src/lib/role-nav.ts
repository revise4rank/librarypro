export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  group?: string;
};

export const ownerNav: NavItem[] = [
  { href: "/owner/dashboard", label: "Overview", shortLabel: "OVR", group: "home" },
  { href: "/owner/actions", label: "Quick Actions", shortLabel: "ACT", group: "home" },
  { href: "/owner/admissions", label: "Admissions", shortLabel: "ADM", group: "students" },
  { href: "/owner/students", label: "Students", shortLabel: "STU", group: "students" },
  { href: "/owner/seats", label: "Seat Control", shortLabel: "SEA", group: "students" },
  { href: "/owner/checkins", label: "Register", shortLabel: "LOG", group: "students" },
  { href: "/owner/payments", label: "Payments", shortLabel: "PAY", group: "money" },
  { href: "/owner/expenses", label: "Expenses", shortLabel: "EXP", group: "money" },
  { href: "/owner/reports", label: "Reports", shortLabel: "RPT", group: "money" },
  { href: "/owner/plans", label: "Plans", shortLabel: "PLN", group: "money" },
  { href: "/owner/billing", label: "Billing", shortLabel: "BIL", group: "money" },
  { href: "/owner/website", label: "Website Builder", shortLabel: "WEB", group: "grow" },
  { href: "/owner/leads", label: "Lead Inbox", shortLabel: "LED", group: "grow" },
  { href: "/owner/campaigns", label: "Campaigns", shortLabel: "CMP", group: "grow" },
  { href: "/owner/offers", label: "Offers", shortLabel: "OFF", group: "grow" },
  { href: "/owner/admins", label: "Admins", shortLabel: "USR", group: "more" },
  { href: "/owner/notifications", label: "Broadcasts", shortLabel: "MSG", group: "more" },
  { href: "/owner/settings", label: "Settings", shortLabel: "SET", group: "more" },
];

export const ownerNavGroups = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "students", label: "Students", icon: "👥" },
  { id: "money", label: "Money", icon: "💰" },
  { id: "grow", label: "Grow", icon: "📢" },
  { id: "more", label: "More", icon: "⚙️" },
];

export const studentNav: NavItem[] = [
  { href: "/student/dashboard", label: "Overview", shortLabel: "OVR", group: "home" },
  { href: "/student/focus", label: "Focus Tracker", shortLabel: "FCS", group: "study" },
  { href: "/student/syllabus", label: "Syllabus", shortLabel: "SYL", group: "study" },
  { href: "/student/revisions", label: "Revision", shortLabel: "REV", group: "study" },
  { href: "/student/focus-mode", label: "Focus Mode", shortLabel: "ZEN", group: "study" },
  { href: "/student/rewards", label: "Rewards", shortLabel: "RWD", group: "study" },
  { href: "/student/books", label: "My Books", shortLabel: "BKS", group: "study" },
  { href: "/student/planner", label: "Study Planner", shortLabel: "PLN", group: "study" },
  { href: "/student/my-library", label: "My Library", shortLabel: "LIB", group: "library" },
  { href: "/student/seat", label: "Seat Info", shortLabel: "SEA", group: "library" },
  { href: "/student/qr", label: "My QR", shortLabel: "QR", group: "library" },
  { href: "/student/join-library", label: "Join Library", shortLabel: "JIN", group: "library" },
  { href: "/student/feed", label: "Library Feed", shortLabel: "FED", group: "library" },
  { href: "/student/payments", label: "Payments", shortLabel: "PAY", group: "more" },
  { href: "/student/notifications", label: "Notifications", shortLabel: "MSG", group: "more" },
  { href: "/student/offers", label: "Explore Opportunities", shortLabel: "OFF", group: "more" },
];

export const studentNavGroups = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "study", label: "Study", icon: "📚" },
  { id: "library", label: "Library", icon: "🏛️" },
  { id: "more", label: "More", icon: "⋯" },
];

export const adminNav = [
  { href: "/superadmin/dashboard", label: "Overview", shortLabel: "OVR" },
  { href: "/superadmin/libraries", label: "Libraries", shortLabel: "LIB" },
  { href: "/superadmin/reviews", label: "Reviews", shortLabel: "REV" },
  { href: "/superadmin/offers", label: "Offers", shortLabel: "OFF" },
  { href: "/superadmin/plans", label: "Plans", shortLabel: "PLN" },
  { href: "/superadmin/payments", label: "Payments", shortLabel: "PAY" },
];
