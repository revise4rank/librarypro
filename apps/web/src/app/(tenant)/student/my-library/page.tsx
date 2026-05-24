import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentMyLibraryManager } from "../../../../components/student-my-library-manager";
import { studentNav, studentNavGroups } from "../../../../lib/role-nav";

export default function StudentMyLibraryPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Student Panel"
      title="Your library — seat, WiFi, notices, and connected libraries."
      description="Everything about your current library in one place. Seat details, WiFi password, active notices, and your QR entry pass."
      nav={studentNav}
      navGroups={studentNavGroups}
    >
      <StudentMyLibraryManager />
    </DashboardShell>
  );
}
