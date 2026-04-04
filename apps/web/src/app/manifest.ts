import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LibraryPro",
    short_name: "LibraryPro",
    description: "Library marketplace, owner dashboard, student portal, and QR-based study attendance in one installable web app.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#d2723d",
    icons: [
      {
        src: "/icons/librarypro-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
