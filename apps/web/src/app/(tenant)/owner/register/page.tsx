import { AuthPageLayout } from "../../../../components/auth-page-layout";
import { OwnerRegisterManager } from "../../../../components/owner-register-manager";

export default function OwnerRegisterPage() {
  return (
    <AuthPageLayout
      eyebrow="Start Free Trial"
      title="Create your library workspace before the first admission."
      description="Set up the owner account, then configure profile, plans, coupons, admissions, roster, and seat operations in one guided workspace."
      accentTitle="Recommended owner journey"
      accentPoints={[
        "Create library account and finish profile setup",
        "Add student plans and optional coupon rules",
        "Use Admissions first, then roster, then seat allotment",
      ]}
      formTitle="Create library account"
      formSubtitle="Use owner details and your library name. You can refine profile, website, plans, QR, and billing later from Settings."
      activeNavLabel="Library Access"
    >
      <OwnerRegisterManager />
    </AuthPageLayout>
  );
}
