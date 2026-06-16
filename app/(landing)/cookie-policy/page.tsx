import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { Cookie, Envelope } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Cookie Policy — SocialBeam",
  description: "Learn about how SocialBeam uses cookies and similar technologies.",
};

const sections = [
  {
    id: "what-are-cookies",
    title: "What Are Cookies",
    content: (
      <>
        <p>
          Cookies are small text files that are placed on your computer or mobile device when you visit a website. They
          are widely used to make websites work more efficiently and provide useful information to website owners.
        </p>
        <p>
          We also use similar technologies such as local storage and session storage, which function similarly to
          cookies. Throughout this policy, we refer to all of these technologies collectively as &quot;cookies.&quot;
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-cookies",
    title: "How We Use Cookies",
    content: (
      <>
        <p>SocialBeam uses cookies for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Essential Cookies:</strong> These are required for the basic operation of our website. They enable
            core functionality such as security, session management, and accessibility. You cannot opt out of these
            cookies as the website cannot function properly without them.
          </li>
          <li>
            <strong>Analytics Cookies:</strong> These help us understand how visitors interact with our website by
            collecting and reporting information anonymously. This allows us to improve how our website works.
          </li>
          <li>
            <strong>Marketing Cookies:</strong> These are used to track visitors across websites to display relevant
            advertisements. They are set by our advertising partners and can only be read by their domain.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "types-of-cookies",
    title: "Types of Cookies We Use",
    content: (
      <>
        <p>We use both session cookies and persistent cookies:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Session Cookies:</strong> These are temporary cookies that are deleted when you close your browser.
            They help us recognize you as you navigate between pages during a single browsing session.
          </li>
          <li>
            <strong>Persistent Cookies:</strong> These remain on your device for a set period of time and are activated
            each time you visit our website. They help us recognize you as a returning visitor.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "third-party-cookies",
    title: "Third-Party Cookies",
    content: (
      <>
        <p>
          Some cookies are placed by third-party services that appear on our pages. We do not control the setting of
          these cookies. Please refer to the third-party websites for more information about their cookies and how to
          manage them.
        </p>
        <p>
          We use the following third-party services that may set cookies: analytics providers (such as Google Analytics),
          social media platforms, and payment processors.
        </p>
      </>
    ),
  },
  {
    id: "managing-cookies",
    title: "Managing Your Cookies",
    content: (
      <>
        <p>
          You can manage your cookie preferences at any time by clicking the button below or through your browser
          settings. Most browsers allow you to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>View what cookies you have and delete them on an individual basis</li>
          <li>Block third-party cookies</li>
          <li>Block cookies from particular sites</li>
          <li>Block all cookies</li>
          <li>Delete all cookies when you close your browser</li>
        </ul>
        <p>
          Please be aware that deleting or blocking cookies may impact your experience on our website, as some features
          may no longer function correctly.
        </p>
      </>
    ),
  },
  {
    id: "cookie-consent",
    title: "Cookie Consent",
    content: (
      <>
        <p>
          When you first visit our website, you will be shown a cookie consent banner allowing you to accept, reject, or
          customize your cookie preferences. Your consent will be stored and reviewed each time you visit our site.
        </p>
        <p>
          You can withdraw your consent at any time by adjusting your preferences through the cookie settings or by
          clearing your browser cookies. Withdrawing consent does not affect the lawfulness of processing based on
          consent before its withdrawal.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data
          practices. When we make changes, we will update the &quot;Last Updated&quot; date at the top of this page.
        </p>
        <p>
          We encourage you to review this policy periodically to stay informed about our use of cookies.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    content: (
      <>
        <p>
          If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
        </p>
        <p className="font-medium text-foreground">Email: hello@socialbeam.ai</p>
      </>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Cookie Policy",
        description:
          "This policy explains how SocialBeam uses cookies and similar technologies to provide and improve our services.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cookie className="w-4 h-4" />
          <span>Last updated: June 15, 2026</span>
        </div>

        <Separator />

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">{section.content}</div>
          </section>
        ))}

        <Separator />

        <div className="flex items-center gap-2 text-muted-foreground">
          <Envelope className="w-5 h-5" />
          <p>
            Questions about cookies? Contact us at{" "}
            <a href="mailto:hello@socialbeam.ai" className="text-brand hover:underline">
              hello@socialbeam.ai
            </a>
          </p>
        </div>
      </div>
    </LandingPageShell>
  );
}
