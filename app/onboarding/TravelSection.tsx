'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface Trip {
  destination: string;
  reason?: string;
  date?: string;
  travelType?: string;
  frequency?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: Trip[];
}

const intro = ` Let’s talk about the places you’ve been and the trips you’ve taken. Whether it was for fun, work, family, or escape — they all tell a story.`;

export default function TravelSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [trips, setTrips] = useState<Trip[]>(() =>
    Array.isArray(existingData) ? [...existingData] : []
  );
  const [step, setStep] = useState(-1);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const isComplete = step >= trips.length;

  useEffect(() => {
    const currentDestination = trips[step]?.destination;
    const rawText =
      step === -1
        ? intro
        : step < trips.length && currentDestination
        ? ` Tell me about your trip to ${currentDestination}.`
        : step < trips.length
        ? ` Tell me about this trip.`
        : ` That’s all for now — but you can always add more later.`;

    indexRef.current = 0;
    setTyping('');
    setShowDots(true);

    const delay = setTimeout(() => {
      setShowDots(false);
      const type = () => {
        if (indexRef.current < rawText.length) {
          const nextChar = rawText.charAt(indexRef.current);
          setTyping((prev) =>
            indexRef.current === 0 && nextChar === ' ' ? prev : prev + nextChar
          );
          indexRef.current++;
          setTimeout(type, 60);
        }
      };
      type();
    }, 900);

    return () => clearTimeout(delay);
  }, [step, trips]);

  const handleChange = <K extends keyof Trip>(
    index: number,
    field: K,
    value: Trip[K]
  ) => {
    setTrips((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addTrip = () => {
    setTrips((prev) => {
      const updated = [...prev, { destination: '' }];
      setStep(updated.length - 1);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, travel: trips }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Travel & Places</h1>
      <p className="text-sm text-gray-600 mb-6">
        Where you go matters. The trips you’ve taken — and the reasons you took them — offer insight into your lifestyle, values, and history. Travel is often tied to relationships, memory, and mindset. It helps your assistant understand your pace, passions, and preferences.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      {step === -1 && (
        <button
          onClick={addTrip}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add a Trip
        </button>
      )}

      {step >= 0 && step < trips.length && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Destination</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="City, country, or landmark"
            value={trips[step].destination || ''}
            onChange={(e) => handleChange(step, 'destination', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Type of Travel</label>
          <select
            className="w-full border p-2 rounded"
            value={trips[step].travelType || ''}
            onChange={(e) => handleChange(step, 'travelType', e.target.value)}
          >
            <option value="">Select one</option>
            <option value="Vacation">Vacation</option>
            <option value="Work or Business">Work or Business</option>
            <option value="Family Visit">Family Visit</option>
            <option value="Event or Occasion">Event or Occasion</option>
            <option value="Personal escape">Personal escape</option>
            <option value="Other">Other</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">Date or Year</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="MM/YYYY or just a year"
            value={trips[step].date || ''}
            onChange={(e) => handleChange(step, 'date', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">How often do you take trips like this?</label>
          <select
            className="w-full border p-2 rounded"
            value={trips[step].frequency || ''}
            onChange={(e) => handleChange(step, 'frequency', e.target.value)}
          >
            <option value="">Select frequency</option>
            <option value="Multiple times per year">Multiple times per year</option>
            <option value="Once a year">Once a year</option>
            <option value="Every few years">Every few years</option>
            <option value="Once in a lifetime">Once in a lifetime</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            className="w-full border p-2 rounded"
            placeholder="Any highlights or personal meaning behind this trip..."
            value={trips[step].notes || ''}
            onChange={(e) => handleChange(step, 'notes', e.target.value)}
          />

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="px-4 py-2 bg-gray-300 text-black rounded disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="space-y-4">
          <button
            onClick={addTrip}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Add Another Trip
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );
}