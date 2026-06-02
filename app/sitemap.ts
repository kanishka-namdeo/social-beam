import type { MetadataRoute } from "next";

const BASE_URL = "https://socialbeam.ai";

const staticRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/features", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/use-cases", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/careers", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/community", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/resources", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/changelog", priority: 0.5, changeFrequency: "daily" as const },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/help", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/api", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/status", priority: 0.3, changeFrequency: "daily" as const },
  { path: "/alternatives", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/alternatives/buffer", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/alternatives/hootsuite", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/alternatives/sprout-social", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/alternatives/later", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/alternatives/metricool", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/platforms/instagram", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/platforms/x", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/platforms/linkedin", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/platforms/facebook", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/platforms/tiktok", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/platforms/pinterest", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
