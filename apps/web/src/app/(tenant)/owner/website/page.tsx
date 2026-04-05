import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { OwnerWebsiteBuilder } from "../../../../components/owner-website-builder";
import { ownerNav } from "../../../../lib/role-nav";

export default function OwnerWebsiteBuilderPage() {
  return (
    <DashboardShell
      productLabel="Nextlib"
      panelLabel="Website Builder"
      title="Control your own premium library website, subdomain, and student entry point."
      description="Premium libraries get their own multipage subdomain website. Owner manages public pages, contact blocks, offers, amenities, and students continue login, QR check-in, notices, and library activity from that same website."
      nav={ownerNav}
      actions={
        <>
          <Link
            href="/library-site"
            className="rounded-full bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
          >
            Preview Public Site
          </Link>
          <button className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-3 text-sm font-bold text-[var(--lp-text)]">
            Publish Changes
          </button>
        </>
      }
    >
      <OwnerWebsiteBuilder
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
          published: false,
        }}
      />
    </DashboardShell>
  );
}
