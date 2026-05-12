import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerWebsiteBuilder } from "../../../../components/owner-website-builder";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerWebsiteBuilderPage() {
  return (
    <DashboardShell
      productLabel="BookLib"
      panelLabel="Website"
      title="Website Builder"
      description="Edit public website pages, brand assets, subdomain publishing, and page content from a dedicated workspace."
      nav={ownerNav}
      actions={
        <Link href="/owner/listing" className="rounded-lg border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">
          Open listing
        </Link>
      }
    >
      <OwnerWebsiteBuilder
        defaultEditorOpen
        initialValues={{
          subdomain: "",
          brandLogoUrl: "",
          heroBannerUrl: "",
          heroTitle: "",
          heroTagline: "",
          aboutText: "",
          contactName: "",
          contactPhone: "",
          whatsappPhone: "",
          addressText: "",
          landmark: "",
          businessHours: "",
          highlightOffer: "",
          offerExpiresAt: "",
          seoTitle: "",
          seoDescription: "",
          adBudget: "0",
          themePrimary: "#d2723d",
          themeAccent: "#2f8f88",
          themeSurface: "#fff9f0",
          amenities: [],
          galleryImages: [],
          sitePages: {},
          published: false,
        }}
      />
    </DashboardShell>
  );
}
