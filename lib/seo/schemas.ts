interface JsonLdContext {
  "@context": string;
  "@type": string;
}

interface BaseSchema extends JsonLdContext {
  name?: string;
  url?: string;
  description?: string;
}

interface OrganizationSchema extends BaseSchema {
  "@type": "Organization";
  logo?: string;
  sameAs?: string[];
  contactPoint?: {
    "@type": string;
    contactType: string;
    url: string;
  };
}

interface WebSiteSchema extends BaseSchema {
  "@type": "WebSite";
  potentialAction?: {
    "@type": string;
    target: string;
    "query-input": string;
  };
}

interface SoftwareApplicationSchema extends BaseSchema {
  "@type": "SoftwareApplication";
  applicationCategory: string;
  operatingSystem: string;
  offers?: {
    "@type": string;
    price: string;
    priceCurrency: string;
  };
  aggregateRating?: {
    "@type": string;
    ratingValue: string;
    ratingCount: string;
  };
}

interface FAQQuestion {
  question: string;
  answer: string;
}

interface FAQPageSchema extends BaseSchema {
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": string;
    name: string;
    acceptedAnswer: {
      "@type": string;
      text: string;
    };
  }>;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbListSchema extends BaseSchema {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": string;
    position: number;
    name: string;
    item: string;
  }>;
}

const BASE_URL = "https://socialbeam.ai";

export function organizationSchema(): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SocialBeam",
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.svg`,
    description: "AI-native social media management platform. Schedule unlimited posts across 10 accounts for free.",
    sameAs: [
      "https://x.com/socialbeam",
      "https://linkedin.com/company/socialbeam",
      "https://github.com/socialbeam",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE_URL}/contact`,
    },
  };
}

export function webSiteSchema(): WebSiteSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SocialBeam",
    url: BASE_URL,
    description: "Free AI-powered social media scheduler. Schedule unlimited posts across 10 accounts.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/blog?s={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SocialBeam",
    applicationCategory: "SocialMediaApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description: "AI-native social media management platform with free scheduling for up to 10 accounts.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "500",
    },
  };
}

export function faqPageSchema(questions: FAQQuestion[]): FAQPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]): BreadcrumbListSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function renderJsonLd(schema: unknown): string {
  return JSON.stringify(schema);
}
