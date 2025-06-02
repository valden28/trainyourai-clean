// Final /app/onboarding/page.tsx with ToneSync accordion item removed
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion'

import IdentitySection from './IdentitySection'
import PeopleSection from './PeopleSection'
import DateSection from './DateSection'
import PreferencesSection from './PreferencesSection'
import BeliefSection from './BeliefSection'
import SkillSection from './SkillSection'
import WorkSection from './WorkSection'
import FoodSection from './FoodSection'
import PhysicalSection from './PhysicalSection'
import PopCultureSection from './PopCultureSection'
import HealthSection from './HealthSection'
import TravelSection from './TravelSection'
import SportsSection from './SportsSection'

export default function OnboardingPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [vault, setVault] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const res = await fetch('/api/vault')
        const json = await res.json()
        setVault(json.vault) // ✅ FIXED: match backend shape
      } catch (err) {
        console.error('❌ Vault fetch error', err)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchVault()
  }, [user])

  if (loading || !vault) {
    return (
      <main className="p-6 text-center text-gray-600">
        Loading your vault...
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Train Your AI</h1>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="identity">
          <AccordionTrigger>1. Identity & Background</AccordionTrigger>
          <AccordionContent>
            <IdentitySection existingData={vault.innerview} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="people">
          <AccordionTrigger>2. People in Your Life</AccordionTrigger>
          <AccordionContent>
            <PeopleSection existingData={vault.people} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dates">
          <AccordionTrigger>3. Important Dates</AccordionTrigger>
          <AccordionContent>
            <DateSection existingData={vault.dates} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>4. Skills & Confidence</AccordionTrigger>
          <AccordionContent>
            <SkillSection existingData={vault.skillsync} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preferences">
          <AccordionTrigger>5. Personality & Preferences</AccordionTrigger>
          <AccordionContent>
            <PreferencesSection existingData={vault.preferences} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="work">
          <AccordionTrigger>6. Work & Role</AccordionTrigger>
          <AccordionContent>
            <WorkSection existingData={vault.work} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beliefs">
          <AccordionTrigger>7. Beliefs, Values & Principles</AccordionTrigger>
          <AccordionContent>
            <BeliefSection existingData={vault.beliefs} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="food">
          <AccordionTrigger>8. Food & Dietary Preferences</AccordionTrigger>
          <AccordionContent>
            <FoodSection existingData={vault.food} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="physical">
          <AccordionTrigger>9. Physical Attributes</AccordionTrigger>
          <AccordionContent>
            <PhysicalSection existingData={vault.physical} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="popculture">
          <AccordionTrigger>10. Pop Culture & Personal Taste</AccordionTrigger>
          <AccordionContent>
            <PopCultureSection existingData={vault.popculture} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sports">
          <AccordionTrigger>11. Sports & Teams</AccordionTrigger>
          <AccordionContent>
            <SportsSection existingData={vault.sports} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="travel">
          <AccordionTrigger>12. Travel</AccordionTrigger>
          <AccordionContent>
            <TravelSection existingData={vault.travel} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="health">
          <AccordionTrigger>13. Medical & Health + Fitness</AccordionTrigger>
          <AccordionContent>
            <HealthSection existingData={vault.health} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-10 text-center text-sm text-gray-500">
        You can return and edit these sections anytime.
      </div>
    </main>
  )
}