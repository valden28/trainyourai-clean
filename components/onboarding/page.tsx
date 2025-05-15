'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import IdentitySection from '@/components/onboarding/IdentitySection';
import PeopleSection from '@/components/onboarding/PeopleSection';
import DateSection from '@/components/onboarding/DateSection';
import PreferencesSection from '@/components/onboarding/PreferencesSection';
import BeliefSection from '@/components/onboarding/BeliefSection';
import SkillSection from '@/components/onboarding/SkillSection';
import WorkSection from '@/components/onboarding/WorkSection';
import FoodSection from '@/components/onboarding/FoodSection';
import PhysicalSection from '@/components/onboarding/PhysicalSection';
import PopCultureSection from '@/components/onboarding/PopCultureSection';
import HealthSection from '@/components/onboarding/HealthSection';
import ToneSyncSection from '@/components/onboarding/ToneSyncSection';

export default function OnboardingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const updateSectionData = (sectionKey: string, data: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        ...data,
      },
    }));
  };

  const handleSubmit = async () => {
    const res = await fetch('/api/save-vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vault: formData }),
    });

    if (res.ok) {
      setSubmitted(true);
      router.push('/chat-core');
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">TrainYourAI: InnerView</h1>
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="identity">
          <AccordionTrigger>1. Identity & Background</AccordionTrigger>
          <AccordionContent>
            <IdentitySection onUpdate={(data) => updateSectionData('innerview', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="people">
          <AccordionTrigger>2. People in Your Life</AccordionTrigger>
          <AccordionContent>
            <PeopleSection onUpdate={(data) => updateSectionData('people', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dates">
          <AccordionTrigger>3. Important Dates</AccordionTrigger>
          <AccordionContent>
            <DateSection onUpdate={(data) => updateSectionData('dates', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preferences">
          <AccordionTrigger>4. Personality & Preferences</AccordionTrigger>
          <AccordionContent>
            <PreferencesSection onUpdate={(data) => updateSectionData('preferences', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beliefs">
          <AccordionTrigger>5. Beliefs, Values & Operating Principles</AccordionTrigger>
          <AccordionContent>
            <BeliefSection onUpdate={(data) => updateSectionData('beliefs', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>6. Skills & Confidence</AccordionTrigger>
          <AccordionContent>
            <SkillSection onUpdate={(data) => updateSectionData('skillsync', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="work">
          <AccordionTrigger>7. Work & Role</AccordionTrigger>
          <AccordionContent>
            <WorkSection onUpdate={(data) => updateSectionData('work', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="food">
          <AccordionTrigger>8. Food & Dietary Preferences</AccordionTrigger>
          <AccordionContent>
            <FoodSection onUpdate={(data) => updateSectionData('food', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="physical">
          <AccordionTrigger>9. Physical Attributes</AccordionTrigger>
          <AccordionContent>
            <PhysicalSection onUpdate={(data) => updateSectionData('physical', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="popculture">
          <AccordionTrigger>10. Pop Culture & Personal Taste</AccordionTrigger>
          <AccordionContent>
            <PopCultureSection onUpdate={(data) => updateSectionData('popculture', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="health">
          <AccordionTrigger>11. Medical & Health + Fitness</AccordionTrigger>
          <AccordionContent>
            <HealthSection onUpdate={(data) => updateSectionData('health', data)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tone">
          <AccordionTrigger>12. ToneSync Preferences</AccordionTrigger>
          <AccordionContent>
            <ToneSyncSection onUpdate={(data) => updateSectionData('tonesync', data)} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save & Launch Assistant
        </button>
      </div>
    </main>
  );
}