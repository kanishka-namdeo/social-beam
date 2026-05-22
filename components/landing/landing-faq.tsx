"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is scheduling really free?",
    answer:
      "Yes. Schedule unlimited posts across 10 accounts with no credit card required. Free forever — no hidden limits or trials. AI features are optional upgrades.",
  },
  {
    question: "What do AI credits do?",
    answer:
      "AI credits power content generation features like AI-written captions, hashtag suggestions, optimal posting time predictions, and engagement analysis. One credit generates roughly one post's worth of AI content.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "SocialBeam supports X (Twitter), LinkedIn, Instagram, Facebook, TikTok, Pinterest, and more. Connect up to 10 accounts on the free tier.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel your AI subscription at any time — your scheduled posts and free features remain active. No lock-in, no cancellation fees.",
  },
  {
    question: "How is this different from Buffer or Hootsuite?",
    answer:
      "Unlike traditional schedulers, SocialBeam is AI-native. Instead of just scheduling, it writes platform-optimized content, predicts optimal posting times, and analyzes performance in natural language — all built into the core product.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Yes. We use encrypted OAuth connections for all social accounts. We never store your social media passwords, and you can disconnect any account at any time from settings.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about SocialBeam.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question} className="border-border">
              <AccordionTrigger className="text-left text-foreground font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
