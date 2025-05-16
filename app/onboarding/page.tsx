'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import Accordion from './ui/accordion';
import { AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import IdentitySection from './IdentitySection';
import PeopleSection from './PeopleSection';
import DateSection from './DateSection';
import PreferencesSection from './PreferencesSection';
import BeliefSection from './BeliefSection';
import SkillSection from './SkillSection';
import WorkSection from './WorkSection';
import FoodSection from './FoodSection';
import PhysicalSection from './PhysicalSection';
import PopCultureSection from './PopCultureSection';
import HealthSection from './HealthSection';
import ToneSyncSection from './ToneSyncSection';

export default function OnboardingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [vault, setVault] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchVault = async () => {
      const res = await fetch('/api/vault');
      const data = await res.json();
      setVault(data);
    };
    fetchVault();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">TrainYourAI: InnerView Onboarding</h1>
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="identity">
          <AccordionTrigger>1. Identity & Background</AccordionTrigger>
          <AccordionContent>
            <IdentitySection existingData={vault?.innerview} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="people">
          <AccordionTrigger>2. People in Your Life</AccordionTrigger>
          <AccordionContent>
            <PeopleSection existingData={vault?.people} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dates">
          <AccordionTrigger>3. Important Dates</AccordionTrigger>
          <AccordionContent>
            <DateSection existingData={vault?.dates} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preferences">
          <AccordionTrigger>4. Personality & Preferences</AccordionTrigger>
          <AccordionContent>
            <PreferencesSection existingData={vault?.preferences} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beliefs">
          <AccordionTrigger>5. Beliefs, Values & Principles</AccordionTrigger>
          <AccordionContent>
            <BeliefSection existingData={vault?.beliefs} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>6. Skills & Confidence</AccordionTrigger>
          <AccordionContent>
            <SkillSection existingData={vault?.skillsync} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="work">
          <AccordionTrigger>7. Work & Role</AccordionTrigger>
          <AccordionContent>
            <WorkSection existingData={vault?.work} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="food">
          <AccordionTrigger>8. Food & Dietary Preferences</AccordionTrigger>
          <AccordionContent>
            <FoodSection existingData={vault?.food} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="physical">
          <AccordionTrigger>9. Physical Attributes</AccordionTrigger>
          <AccordionContent>
            <PhysicalSection existingData={vault?.physical} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="popculture">
          <AccordionTrigger>10. Pop Culture & Personal Taste</AccordionTrigger>
          <AccordionContent>
            <PopCultureSection existingData={vault?.popculture} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="health">
          <AccordionTrigger>11. Medical & Health + Fitness</AccordionTrigger>
          <AccordionContent>
            <HealthSection existingData={vault?.health} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tone">
          <AccordionTrigger>12. ToneSync Preferences</AccordionTrigger>
          <AccordionContent>
            <ToneSyncSection existingData={vault?.tonesync} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
}