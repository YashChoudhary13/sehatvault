import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SehatVault",
    short_name: "SehatVault",
    description:
      "A private family health-record vault for India, built for secure capture, storage, and sharing.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#FBFBFE",
    theme_color: "#4F46E5",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
