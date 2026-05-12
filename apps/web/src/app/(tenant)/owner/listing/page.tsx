import { redirect } from "next/navigation";

export default function OwnerListingPage() {
  redirect("/owner/settings?tab=listing");
}
