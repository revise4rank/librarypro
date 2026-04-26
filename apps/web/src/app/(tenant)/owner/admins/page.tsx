import { redirect } from "next/navigation";

export default function OwnerAdminsPage() {
  redirect("/owner/settings?tab=team");
}
