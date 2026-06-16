"use client";

import { useState } from 'react';
import { ProfileAnalysisCard } from '@/components/dashboard/profile-analysis-card';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { PageHeader } from '@/components/shared/page-header';

export default function TestProfilePage() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <div className="mx-auto max-w-6xl p-8 space-y-8">
        <PageHeader
          title="Profile Analysis Test Page"
          backLink={{ href: "/dashboard", label: "Dashboard" }}
        />
        <p className="text-muted-foreground">First widget hidden. Click &quot;Reset&quot; to show again.</p>
        <button onClick={() => setVisible(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-8">
      <PageHeader
        title="Profile Analysis Test Page"
        backLink={{ href: "/dashboard", label: "Dashboard" }}
      />

      <h2 className="text-xl font-semibold">Scenario 1: Full Profile Data (col-span-4)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard className="col-span-4">
          <ProfileAnalysisCard
            profile={{
              tone: 'professional',
              postTypes: {
                educational: 40,
                promotional: 20,
                engagement: 25,
                behind_the_scenes: 15,
              },
              audience: {
                interests: ['technology', 'productivity', 'entrepreneurship'],
              },
              bio: {
                industry: 'SaaS',
              },
            }}
          />
        </WidgetCard>
      </div>

      <h2 className="text-xl font-semibold">Scenario 2: Minimal Profile (col-span-2)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard className="col-span-2">
          <ProfileAnalysisCard
            profile={{
              tone: 'professional',
              postTypes: null,
              audience: null,
              bio: {
                industry: 'Technology',
              },
            }}
          />
        </WidgetCard>

        <WidgetCard className="col-span-2">
          <ProfileAnalysisCard
            profile={{
              tone: null,
              postTypes: null,
              audience: null,
              bio: null,
            }}
          />
        </WidgetCard>
      </div>

      <h2 className="text-xl font-semibold">Scenario 3: Witty Tone + Large Content Mix (col-span-4)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard className="col-span-4">
          <ProfileAnalysisCard
            profile={{
              tone: 'witty',
              postTypes: {
                text: 50,
                image: 30,
                video: 20,
                carousel: 10,
                reel: 15,
              },
              audience: {
                interests: ['marketing', 'social media', 'content creation', 'analytics'],
              },
              bio: {
                industry: 'Digital Marketing Agency',
              },
            }}
          />
        </WidgetCard>
      </div>

      <h2 className="text-xl font-semibold">Scenario 4: Narrow Widget (col-span-1)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard className="col-span-1">
          <ProfileAnalysisCard
            profile={{
              tone: 'casual',
              postTypes: { text: 60, image: 40 },
              audience: { interests: ['design', 'ux'] },
              bio: { industry: 'Design Studio' },
            }}
          />
        </WidgetCard>
      </div>
    </div>
  );
}
