import { redirect } from "next/navigation";

export default function OwnerWebsiteBuilderPage() {
  redirect("/owner/settings?tab=website");
}
