import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaProvider } from "../components/pwa-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nextlib",
  description: "Nextlib is a multi-tenant library marketplace, owner workspace, and student productivity platform.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}
