'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
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
import TravelSection from './TravelSection';
import SportsSection from './SportsSection';

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

        <AccordionItem value="skills">
          <AccordionTrigger>4. Skills & Confidence</AccordionTrigger>
          <AccordionContent>
            <SkillSection existingData={vault?.skillsync} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preferences">
          <AccordionTrigger>5. Personality & Preferences</AccordionTrigger>
          <AccordionContent>
            <PreferencesSection existingData={vault?.preferences} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="work">
          <AccordionTrigger>6. Work & Role</AccordionTrigger>
          <AccordionContent>
            <WorkSection existingData={vault?.work} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beliefs">
          <AccordionTrigger>7. Beliefs, Values & Principles</AccordionTrigger>
          <AccordionContent>
            <BeliefSection existingData={vault?.beliefs} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="food">
          <AccordionTrigger>8. Food & Dietary Preferences</AccordionTrigger>
          <AccordionContent>
            <FoodSection existingData={vault?.food} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="popculture">
          <AccordionTrigger>9. Pop Culture & Personal Taste</AccordionTrigger>
          <AccordionContent>
            <PopCultureSection existingData={vault?.popculture} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sports">
          <AccordionTrigger>10. Sports & Teams</AccordionTrigger>
          <AccordionContent>
            <SportsSection existingData={vault?.sports} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="travel">
          <AccordionTrigger>11. Travel</AccordionTrigger>
          <AccordionContent>
            <TravelSection existingData={vault?.travel} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="health">
          <AccordionTrigger>12. Medical & Health + Fitness</AccordionTrigger>
          <AccordionContent>
            <HealthSection existingData={vault?.health} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tone">
          <AccordionTrigger>13. ToneSync Preferences</AccordionTrigger>
          <AccordionContent>
            <ToneSyncSection existingData={vault?.tonesync} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-10">
        <p className="text-sm text-gray-600 mb-2">You can return and edit these sections anytime.</p>
        <div className="flex justify-end">
          <button
            onClick={() => router.push('/chat-core')}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Launch Assistant
          </button>
        </div>
      </div>
    </main>
  );
}