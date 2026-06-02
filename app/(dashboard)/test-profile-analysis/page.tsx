"use client";

import { useState } from 'react';
import { ProfileAnalysisCard } from '@/components/dashboard/profile-analysis-card';
import { WidgetCard } from '@/components/dashboard/widget-card';

export default function TestProfilePage() {
  const [colSpan1, setColSpan1] = useState<1 | 2 | 4>(4);
  const [colSpan2, setColSpan2] = useState<1 | 2 | 4>(2);
  const [colSpan3, setColSpan3] = useState<1 | 2 | 4>(4);
  const [colSpan4, setColSpan4] = useState<1 | 2 | 4>(1);
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <div className="mx-auto max-w-6xl p-8 space-y-8">
        <h1 className="text-2xl font-bold">Profile Analysis Test Page</h1>
        <p className="text-muted-foreground">First widget hidden. Click &quot;Reset&quot; to show again.</p>
        <button onClick={() => setVisible(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-8">
      <h1 className="text-2xl font-bold">Profile Analysis Test Page</h1>
      
      <h2 className="text-xl font-semibold">Scenario 1: Full Profile Data (colSpan: {colSpan1})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard id="full-profile" colSpan={colSpan1} onResize={setColSpan1} onHide={() => setVisible(false)}>
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

      <h2 className="text-xl font-semibold">Scenario 2: Minimal Profile (colSpan: {colSpan2})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard id="minimal-profile" colSpan={colSpan2} onResize={setColSpan2}>
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

        <WidgetCard id="empty-profile" colSpan={colSpan2} onResize={() => {}}>
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

      <h2 className="text-xl font-semibold">Scenario 3: Witty Tone + Large Content Mix (colSpan: {colSpan3})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard id="large-profile" colSpan={colSpan3} onResize={setColSpan3}>
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

      <h2 className="text-xl font-semibold">Scenario 4: Narrow Widget (colSpan: {colSpan4})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WidgetCard id="narrow-profile" colSpan={colSpan4} onResize={setColSpan4}>
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
