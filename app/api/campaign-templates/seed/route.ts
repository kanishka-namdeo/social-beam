import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const SYSTEM_TEMPLATES = [
  {
    name: "Product Launch",
    description: "A comprehensive 10-day product launch campaign with teaser, launch, social proof, and last call phases.",
    goal: "product_launch",
    audience: "Early adopters and target customers",
    duration: "10-day",
    phases: [
      { name: "Build Anticipation", phase: "TEASER" as const, order: 0, description: "3 days before launch - create buzz and curiosity" },
      { name: "Launch Day", phase: "LAUNCH" as const, order: 1, description: "Day of launch - announce with strong CTA" },
      { name: "Customer Stories", phase: "SOCIAL_PROOF" as const, order: 2, description: "2 days after launch - share early testimonials" },
      { name: "Final Push", phase: "LAST_CALL" as const, order: 3, description: "5 days after launch - last chance messaging" },
    ],
  },
  {
    name: "Event Promotion",
    description: "An 11-day event promotion campaign to drive registrations and attendance.",
    goal: "event_promotion",
    audience: "Event attendees and stakeholders",
    duration: "11-day",
    phases: [
      { name: "Event Teaser", phase: "TEASER" as const, order: 0, description: "7 days before event - build excitement" },
      { name: "Speaker Highlights", phase: "SOCIAL_PROOF" as const, order: 1, description: "3 days before event - showcase speakers and past attendees" },
      { name: "Registration Open", phase: "LAUNCH" as const, order: 2, description: "Day of event - final registration push" },
      { name: "Last Chance", phase: "LAST_CALL" as const, order: 3, description: "1 day after event - replay availability" },
    ],
  },
  {
    name: "Brand Awareness",
    description: "A 14-day brand awareness campaign to increase visibility and engagement.",
    goal: "brand_awareness",
    audience: "Target market and potential customers",
    duration: "14-day",
    phases: [
      { name: "Brand Teaser", phase: "TEASER" as const, order: 0, description: "Introduce brand story and values" },
      { name: "Brand Launch", phase: "LAUNCH" as const, order: 1, description: "Showcase key products and benefits" },
      { name: "Customer Testimonials", phase: "SOCIAL_PROOF" as const, order: 2, description: "Share customer success stories" },
    ],
  },
  {
    name: "Thought Leadership",
    description: "A 21-day thought leadership campaign to establish industry authority.",
    goal: "thought_leadership",
    audience: "Industry professionals and decision makers",
    duration: "21-day",
    phases: [
      { name: "Insight Launch", phase: "LAUNCH" as const, order: 0, description: "Share key insights and research" },
      { name: "Expert Validation", phase: "SOCIAL_PROOF" as const, order: 1, description: "Showcase expert endorsements" },
      { name: "Follow-up Discussion", phase: "CUSTOM" as const, order: 2, description: "Engage in deeper discussion and Q&A" },
    ],
  },
  {
    name: "Flash Sale",
    description: "A high-urgency 3-day flash sale campaign to drive quick conversions.",
    goal: "flash_sale",
    audience: "Existing customers and warm leads",
    duration: "3-day",
    phases: [
      { name: "Sale Preview", phase: "TEASER" as const, order: 0, description: "1 day before sale - build anticipation" },
      { name: "Sale Live", phase: "LAUNCH" as const, order: 1, description: "Day of sale - announce with urgency" },
      { name: "Final Hours", phase: "LAST_CALL" as const, order: 2, description: "Hours before sale ends - maximum urgency" },
    ],
  },
];

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingCount = await prisma.campaignTemplate.count({
      where: { isSystem: true },
    });

    if (existingCount > 0) {
      log.info("api.campaign-templates.seed.already_seeded", {
        userId: user.id,
        count: existingCount,
      });
      return NextResponse.json({
        data: { seeded: false, message: "System templates already exist" },
      });
    }

    const workspaceId = user.workspaceId!;
    const created = await prisma.$transaction(
      SYSTEM_TEMPLATES.map((template) =>
        prisma.campaignTemplate.create({
          data: {
            id: crypto.randomUUID(),
            workspaceId,
            name: template.name,
            description: template.description,
            goal: template.goal,
            audience: template.audience,
            duration: template.duration,
            phases: template.phases,
            isSystem: true,
          },
        }),
      ),
    );

    log.info("api.campaign-templates.seed.success", {
      userId: user.id,
      count: created.length,
    });

    return NextResponse.json({
      data: { seeded: true, count: created.length, templates: created },
    }, { status: 201 });
  } catch (error) {
    log.error("api.campaign-templates.seed.error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
