import { DashboardShell } from "../../../../components/dashboard-shell";
import { StudentBooksManager } from "../../../../components/student-books-manager";
import { studentNav, studentNavGroups } from "../../../../lib/role-nav";

export default function StudentBooksPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Student Panel"
      title="My Books"
      description="Track the books you are reading, completed, or plan to read. Log your progress page by page."
      nav={studentNav}
      navGroups={studentNavGroups}
    >
      <StudentBooksManager />
    </DashboardShell>
  );
}
