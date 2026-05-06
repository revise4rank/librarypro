import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BookLib",
    short_name: "BookLib",
    description: "BookLib brings together a library marketplace, owner dashboard, student portal, and QR-based attendance in one installable web app.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#d2723d",
    icons: [
      {
        src: "/icons/booklib-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
