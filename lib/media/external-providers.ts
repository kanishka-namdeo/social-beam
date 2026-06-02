import type { ExternalMediaItem } from "@/lib/media/types";

export type { ExternalMediaItem } from "@/lib/media/types";

export interface ExternalSearchResult {
  items: ExternalMediaItem[];
  total: number;
  page: number;
  perPage: number;
}

export type ProviderName = "unsplash" | "pexels" | "giphy";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing API key: set ${name} in your environment`);
  }
  return value;
}

const UNSPLASH_PER_PAGE = 20;
const PEXELS_PER_PAGE = 20;
const GIPHY_PER_PAGE = 20;

export async function searchUnsplash(query: string, page: number): Promise<ExternalSearchResult> {
  const accessKey = requireEnv("UNSPLASH_ACCESS_KEY");

  const searchQuery = query || "trending";
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", searchQuery);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(UNSPLASH_PER_PAGE));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Unsplash rate limit reached — try again in a few minutes");
    }
    throw new Error(`Unsplash API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as {
    total: number;
    results: Array<{
      id: string;
      width: number;
      height: number;
      urls: { full: string; small: string };
      user: { name: string; links: { html: string } };
    }>;
  };

  return {
    items: json.results.map((item) => ({
      id: item.id,
      url: item.urls.full,
      thumbUrl: item.urls.small,
      width: item.width,
      height: item.height,
      userName: item.user.name,
      userUrl: item.user.links.html,
      mimeType: "image/jpeg",
    })),
    total: json.total,
    page,
    perPage: UNSPLASH_PER_PAGE,
  };
}

export async function searchPexels(query: string, page: number): Promise<ExternalSearchResult> {
  const apiKey = requireEnv("PEXELS_API_KEY");

  const searchQuery = query || "trending";
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", searchQuery);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PEXELS_PER_PAGE));

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Pexels rate limit reached — try again in a few minutes");
    }
    throw new Error(`Pexels API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as {
    total_results: number;
    photos: Array<{
      id: number;
      width: number;
      height: number;
      src: { original: string; medium: string };
      photographer: string;
      url: string;
    }>;
  };

  return {
    items: json.photos.map((item) => ({
      id: String(item.id),
      url: item.src.original,
      thumbUrl: item.src.medium,
      width: item.width,
      height: item.height,
      userName: item.photographer,
      userUrl: item.url,
      mimeType: "image/jpeg",
    })),
    total: json.total_results,
    page,
    perPage: PEXELS_PER_PAGE,
  };
}

export async function searchGiphy(query: string, page: number): Promise<ExternalSearchResult> {
  const apiKey = requireEnv("GIPHY_API_KEY");

  const endpoint = query ? "search" : "trending";
  const url = new URL(`https://api.giphy.com/v2/gifs/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", String(GIPHY_PER_PAGE));
  url.searchParams.set("offset", String((page - 1) * GIPHY_PER_PAGE));
  if (query) {
    url.searchParams.set("q", query);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("GIPHY rate limit reached — try again later today");
    }
    throw new Error(`GIPHY API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as {
    pagination: { total_count: number };
    data: Array<{
      id: string;
      images: {
        original: { url: string; width: string; height: string };
        fixed_height: { url: string; width: string; height: string };
      };
      user: { display_name?: string } | null;
      import_datetime?: string;
    }>;
  };

  return {
    items: json.data.map((item) => {
      // Prefer fixed_height for smaller file sizes, fall back to original
      const img = item.images.fixed_height.height !== "0"
        ? item.images.fixed_height
        : item.images.original;

      return {
        id: item.id,
        url: img.url,
        thumbUrl: item.images.fixed_height.url,
        width: parseInt(img.width, 10) || 480,
        height: parseInt(img.height, 10) || 270,
        userName: item.user?.display_name ?? "GIPHY",
        mimeType: "image/gif",
      };
    }),
    total: json.pagination.total_count,
    page,
    perPage: GIPHY_PER_PAGE,
  };
}

export async function searchProvider(provider: ProviderName, query: string, page: number): Promise<ExternalSearchResult> {
  switch (provider) {
    case "unsplash":
      return searchUnsplash(query, page);
    case "pexels":
      return searchPexels(query, page);
    case "giphy":
      return searchGiphy(query, page);
  }
}
