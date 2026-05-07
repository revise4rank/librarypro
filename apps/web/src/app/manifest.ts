import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BookLib",
    short_name: "BookLib",
    description: "BookLib brings together a library marketplace, owner dashboard, student portal, and QR-based attendance in one installable web app.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#071636",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
