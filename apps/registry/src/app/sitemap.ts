import type { MetadataRoute } from "next";
import { getModuleKeys } from "@/lib/registry";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/publish`, changeFrequency: "monthly", priority: 0.7 },
    ...getModuleKeys().map((key) => ({
      url: `${SITE.url}/modules/${key}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
