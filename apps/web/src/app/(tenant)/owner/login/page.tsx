import { AuthPageLayout } from "../../../../components/auth-page-layout";
import { OwnerLoginForm } from "../../../../components/owner-login-form";

export default function OwnerLoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Owner Access"
      title="Log in to run seats, students, payments, and your public library website."
      description="Owner panel should feel like a real operating system for your library, not a random page. Manage daily operations, admissions, dues, notifications, and website updates from one place."
      accentTitle="Owner workspace includes"
      accentPoints={[
        "Seat layout and student assignment control",
        "Payments, dues, notices, and expiry tracking",
        "Public subdomain website and marketplace presence",
      ]}
      formTitle="Owner login"
      formSubtitle="Use your owner email or phone to enter the dashboard."
    >
      <OwnerLoginForm />
    </AuthPageLayout>
  );
}
