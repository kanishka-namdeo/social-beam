import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { Scales, Envelope } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service — SocialBeam",
  description:
    "SocialBeam's terms of service. Read about your rights and responsibilities when using our platform.",
};

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    content: (
      <>
        <p>
          By accessing or using SocialBeam (&quot;the Service&quot;), you agree to be bound by these Terms of Service
          (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you and SocialBeam Inc. (&quot;Company,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We may update these Terms from time to time, and your
          continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.
        </p>
      </>
    ),
  },
  {
    id: "account-registration",
    title: "Account Registration",
    content: (
      <>
        <p>
          To use certain features of the Service, you must create an account. You agree to provide accurate, current,
          and complete information during registration and to update this information as necessary.
        </p>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities
          that occur under your account. You must notify us immediately if you suspect any unauthorized use of your
          account. You may not share your account credentials or transfer your account to another party without our
          prior written consent.
        </p>
      </>
    ),
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    content: (
      <>
        <p>
          You are solely responsible for the content you create, schedule, and publish through the Service. You agree
          to comply with all applicable laws and regulations, as well as the terms of service of any social media
          platforms you connect to SocialBeam.
        </p>
        <p>
          You must not use the Service to publish content that is illegal, defamatory, discriminatory, or that
          infringes on the intellectual property rights of others. You are responsible for ensuring you have the
          necessary rights to all content you post, including images, text, and media.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    content: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Send spam, unsolicited mass messages, or deceptive content</li>
          <li>Violate the terms of service of any connected social media platform</li>
          <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
          <li>Use automated means to scrape, crawl, or extract data from the Service beyond its intended functionality</li>
          <li>Reverse engineer, decompile, or disassemble any aspect of the Service</li>
          <li>Resell, redistribute, or sublicense the Service without explicit authorization</li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    content: (
      <>
        <p>
          The Service and its original content, features, functionality, and branding are and will remain the exclusive
          property of SocialBeam and its licensors. The Service is protected by copyright, trademark, and other laws.
        </p>
        <p>
          You retain all rights to the content you create and publish through the Service. By using the Service, you
          grant us a limited license to store, process, and transmit your content solely for the purpose of providing
          the Service to you. This license does not give us ownership of your content.
        </p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    content: (
      <>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
          express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or free from
          viruses or other harmful components.
        </p>
        <p>
          To the maximum extent permitted by law, SocialBeam shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising
          from your use of or inability to use the Service, even if we have been advised of the possibility of such
          damages.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <>
        <p>
          We may terminate or suspend your access to the Service at any time, with or without cause, and with or without
          notice. Upon termination, your right to use the Service will immediately cease.
        </p>
        <p>
          You may cancel your account at any time through the account settings. Upon cancellation, we will retain your
          data for 30 days to allow you to export it, after which it will be permanently deleted in accordance with our
          Privacy Policy. Any fees paid prior to cancellation are non-refundable except as required by law.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-terms",
    title: "Changes to Terms",
    content: (
      <>
        <p>
          We reserve the right to modify these Terms at any time. When we make material changes, we will provide notice
          through the Service or via email at least 30 days before the changes take effect.
        </p>
        <p>
          Your continued use of the Service after the effective date of revised Terms constitutes your acceptance of the
          changes. If you do not agree to the modified Terms, you should discontinue use of the Service.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law and Jurisdiction",
    content: (
      <>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United
          States, without regard to its conflict of law provisions.
        </p>
        <p>
          Any disputes arising from or relating to these Terms or the Service shall be resolved through good-faith
          negotiation. If negotiation fails, disputes shall be submitted to binding arbitration administered by the
          American Arbitration Association (AAA) in accordance with its Commercial Arbitration Rules. The arbitration
          shall take place in Wilmington, Delaware, and judgment on the award may be entered in any court of competent
          jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "class-action-waiver",
    title: "Class Action Waiver",
    content: (
      <>
        <p>
          YOU AND SOCIALBEAM AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY,
          AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
        </p>
        <p>
          If any court or arbitrator determines that the class action waiver set forth in this section is unenforceable,
          the entirety of this Dispute Resolution section shall be deemed unenforceable. The class action waiver does not
          affect your right to participate in government enforcement actions.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <p className="font-medium text-foreground">Email: hello@socialbeam.ai</p>
        <p>
          We will respond to inquiries regarding these Terms within 30 business days. For legal notices, please mark
          your correspondence as &quot;Legal Notice&quot; to ensure prompt handling.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Terms of Service",
        description:
          "Please read these terms carefully before using SocialBeam. They govern your use of our platform.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Scales className="w-4 h-4" />
          <span>Last updated: June 15, 2026</span>
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
            Questions about these terms? Contact us at{" "}
            <a href="mailto:hello@socialbeam.ai" className="text-brand hover:underline">
              hello@socialbeam.ai
            </a>
          </p>
        </div>
      </div>
    </LandingPageShell>
  );
}
