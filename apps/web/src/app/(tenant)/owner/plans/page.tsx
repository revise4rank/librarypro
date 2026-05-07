import { redirect } from "next/navigation";

export default function OwnerPlansPage() {
  redirect("/owner/settings?tab=plans");
}
