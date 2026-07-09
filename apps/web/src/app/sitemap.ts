import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/modules`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/releases`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/community`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
