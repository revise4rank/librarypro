import { AuthPageLayout } from "../../../../components/auth-page-layout";
import { StudentRegisterManager } from "../../../../components/student-register-manager";

export default function StudentRegisterPage() {
  return (
    <AuthPageLayout
      eyebrow="Student Account"
      title="Create one student app account, then connect it to the right library later."
      description="Your student app identity stays the same across join requests, QR access, dues, notices, and study continuity. Library admission still happens separately through the owner desk."
      accentTitle="Student account gives you"
      accentPoints={[
        "One login across your student app and future library connections",
        "A clean path to send join requests before roster activation",
        "Study continuity for focus, revision, rewards, and notices",
      ]}
      formTitle="Create student account"
      formSubtitle="Start with your student identity first. Then connect it to a library after admission review."
      activeNavLabel="Student Login"
    >
      <StudentRegisterManager />
    </AuthPageLayout>
  );
}
