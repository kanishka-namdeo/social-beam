import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Envelope } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — SocialBeam",
  description:
    "SocialBeam's privacy policy. Learn how we collect, use, and protect your personal information.",
};

const sections = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    content: (
      <>
        <p>
          We collect information you provide directly, such as your name, email address, and payment details when you
          create an account or make a purchase. We also collect usage data, including how you interact with our platform,
          the posts you schedule, and the social media accounts you connect.
        </p>
        <p>
          Additionally, we automatically collect certain technical information when you use our services, including your
          IP address, browser type, device information, and access timestamps. This data helps us improve our services
          and ensure platform security.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How We Use Your Information",
    content: (
      <>
        <p>
          We use the information we collect to provide, maintain, and improve our services. This includes processing
          your scheduled posts, generating AI-powered content recommendations, and delivering analytics about your
          social media performance.
        </p>
        <p>
          We also use your information to communicate with you about account updates, new features, and important policy
          changes. With your consent, we may send you marketing communications about products and services we believe
          may interest you. You can opt out of these communications at any time.
        </p>
      </>
    ),
  },
  {
    id: "data-sharing",
    title: "Data Sharing and Disclosure",
    content: (
      <>
        <p>
          We do not sell your personal information. We may share your data with trusted service providers who assist us
          in operating our platform, such as payment processors, cloud hosting providers, and analytics services. These
          partners are contractually obligated to protect your information and use it only for the purposes we specify.
        </p>
        <p>
          We may also disclose your information if required by law, to protect our legal rights, or to prevent fraud and
          abuse. In the event of a merger, acquisition, or sale of assets, your information may be transferred as part
          of that transaction.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    content: (
      <>
        <p>
          We implement industry-standard security measures to protect your personal information, including encryption
          in transit and at rest, access controls, and regular security audits. Access tokens and OAuth credentials are
          encrypted using AES-256 encryption and stored securely.
        </p>
        <p>
          While we strive to protect your data, no method of transmission over the Internet or electronic storage is
          100% secure. We cannot guarantee absolute security but continuously work to strengthen our defenses and
          respond promptly to any potential security incidents.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content: (
      <>
        <p>
          Depending on your location, you may have certain rights regarding your personal data. These include the right
          to access, correct, or delete your information, the right to data portability, and the right to object to or
          restrict certain processing activities.
        </p>
        <p>
          To exercise any of these rights, please contact us at the email address provided below. We will respond to
          verified requests within 30 days. You also have the right to lodge a complaint with a supervisory authority if
          you believe we have not handled your data appropriately.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and Tracking",
    content: (
      <>
        <p>
          We use cookies and similar tracking technologies to provide and improve our services, analyze usage patterns,
          and personalize your experience. Essential cookies are required for the platform to function, including session
          management and security features.
        </p>
        <p>
          We also use analytics cookies to understand how users interact with our platform. You can manage your cookie
          preferences through your browser settings. Please note that disabling certain cookies may affect the
          functionality of our services.
        </p>
      </>
    ),
  },
  {
    id: "children-privacy",
    title: "Children's Privacy",
    content: (
      <>
        <p>
          SocialBeam is not intended for children under the age of 16. We do not knowingly collect personal information
          from children. If we become aware that we have inadvertently collected personal data from a child under 16, we
          will take steps to delete that information as quickly as possible.
        </p>
        <p>
          If you are a parent or guardian and believe your child has provided us with personal information, please
          contact us immediately so we can take appropriate action.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
          requirements, or other factors. When we make significant changes, we will notify you through the platform or
          via email.
        </p>
        <p>
          We encourage you to review this policy periodically. The &quot;Last Updated&quot; date at the top of this page
          indicates when the policy was most recently revised. Your continued use of our services after changes are
          posted constitutes your acceptance of the updated policy.
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
          If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please
          contact us at:
        </p>
        <p className="font-medium text-foreground">Email: hello@socialbeam.ai</p>
        <p>
          We will respond to all inquiries within 30 days. For urgent security-related concerns, please mark your email
          as &quot;Security Inquiry&quot; so we can prioritize it appropriately.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Privacy Policy",
        description:
          "We are committed to protecting your personal information and being transparent about how we use it.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span>Last updated: May 22, 2026</span>
        </div>

        <Separator />

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">{section.content}</div>
          </section>
        ))}

        <Separator />

        {/* Contact CTA */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Envelope className="w-5 h-5" />
          <p>
            Questions about your privacy? Contact us at{" "}
            <a href="mailto:hello@socialbeam.ai" className="text-brand hover:underline">
              hello@socialbeam.ai
            </a>
          </p>
        </div>
      </div>
    </LandingPageShell>
  );
}
