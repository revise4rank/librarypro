import { redirect } from "next/navigation";

export default function OwnerCouponsPage() {
  redirect("/owner/settings?tab=plans");
}
