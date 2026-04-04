import { AuthPageLayout } from "../../../components/auth-page-layout";
import { RoleLoginForm } from "../../../components/owner-login-form";

export default function SuperAdminLoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Platform Access"
      title="Log in to monitor platform revenue, libraries, renewals, and billing health."
      description="Super admin panel should give a clear business view of the full SaaS platform: active libraries, plan growth, payment failures, and overdue renewals."
      accentTitle="Platform workspace includes"
      accentPoints={[
        "MRR, payments, and subscription visibility",
        "Library onboarding and tenant health monitoring",
        "Plan control and billing issue review",
      ]}
      formTitle="Super admin login"
      formSubtitle="Use your admin email to access the platform command center."
    >
      <RoleLoginForm
        expectedRole="SUPER_ADMIN"
        loginPlaceholder="Admin email"
        passwordPlaceholder="Password"
        submitLabel="Login as Super Admin"
      />
    </AuthPageLayout>
  );
}
