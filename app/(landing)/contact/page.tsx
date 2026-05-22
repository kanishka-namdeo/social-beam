import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Envelope,
  Clock,
  ArrowRight,
  TwitterLogo,
  LinkedinLogo,
  InstagramLogo,
  ChatCircleText,
  MapPin,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Contact Us — SocialBeam",
  description:
    "Get in touch with the SocialBeam team. We'd love to hear from you — questions, feedback, or partnership inquiries.",
};

export default function ContactPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Get in touch",
        description:
          "Have a question, feedback, or partnership inquiry? We are here to help and we would love to hear from you.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Form */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Send us a message</CardTitle>
              <CardDescription className="text-muted-foreground">
                Fill out the form below and we will get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="What is this about?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more..."
                    rows={5}
                  />
                </div>
                <Button type="submit" className="w-full gap-2">
                  Send message
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* Email */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Envelope className="w-5 h-5 text-brand" />
                  </div>
                  <CardTitle className="text-base text-foreground">Email</CardTitle>
                </div>
                <CardDescription>
                  Reach us directly at{" "}
                  <a href="mailto:hello@socialbeam.ai" className="text-brand hover:underline font-medium">
                    hello@socialbeam.ai
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Response Time */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-brand" />
                  </div>
                  <CardTitle className="text-base text-foreground">Response Time</CardTitle>
                </div>
                <CardContent className="pl-0 pt-0">
                  <div className="space-y-3 text-muted-foreground text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span>General inquiries</span>
                      <span className="font-medium text-foreground">Within 24 hours</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span>Technical support</span>
                      <span className="font-medium text-foreground">Within 4 hours</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span>Partnership inquiries</span>
                      <span className="font-medium text-foreground">Within 48 hours</span>
                    </div>
                  </div>
                </CardContent>
              </CardHeader>
            </Card>

            {/* Social Media */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <ChatCircleText className="w-5 h-5 text-brand" />
                  </div>
                  <CardTitle className="text-base text-foreground">Follow Us</CardTitle>
                </div>
                <CardContent className="pl-0 pt-0">
                  <div className="flex gap-3">
                    <a
                      href="https://twitter.com/socialbeam"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/50 transition-colors"
                      aria-label="Follow us on X (Twitter)"
                    >
                      <TwitterLogo className="w-5 h-5" />
                    </a>
                    <a
                      href="https://linkedin.com/company/socialbeam"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/50 transition-colors"
                      aria-label="Follow us on LinkedIn"
                    >
                      <LinkedinLogo className="w-5 h-5" />
                    </a>
                    <a
                      href="https://instagram.com/socialbeam"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-brand hover:border-brand/50 transition-colors"
                      aria-label="Follow us on Instagram"
                    >
                      <InstagramLogo className="w-5 h-5" />
                    </a>
                  </div>
                </CardContent>
              </CardHeader>
            </Card>
          </div>
        </div>

        <Separator />

        {/* FAQ Link */}
        <Card className="border-border bg-muted/30 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <MapPin className="w-12 h-12 text-brand mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Looking for help articles?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Browse our knowledge base for guides, tutorials, and answers to frequently asked questions.
            </p>
            <Link href="/help">
              <Button variant="outline" className="gap-2">
                Visit Help Center
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </LandingPageShell>
  );
}
