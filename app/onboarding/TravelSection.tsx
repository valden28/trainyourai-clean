'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface TripEntry {
  destination?: string;
  type?: string;
  date?: string;
  frequency?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: {
    trips?: TripEntry[];
    narrative?: string;
  };
}

const intro = `Let’s log a few places you’ve been — trips, escapes, or events that mattered.
This helps me reference meaningful experiences, anticipate seasons or rituals, and guide recommendations with context.`;

const tripTypes = [
  'Vacation',
  'Work / Business',
  'Family Visit',
  'Event or Occasion',
  'Personal escape',
  'Other'
];

const frequencyOptions = [
  'Multiple times per year',
  'Once a year',
  'Every few years',
  'Once in a lifetime'
];

export default function TravelSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [trips, setTrips] = useState<TripEntry[]>(existingData?.trips || []);
  const [narrative, setNarrative] = useState(existingData?.narrative || '');
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const rawText = intro;
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
  }, []);

  const handleChange = (index: number, key: keyof TripEntry, value: string) => {
    setTrips((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const addTrip = () => {
    setTrips((prev) => [...prev, {}]);
  };

  const removeTrip = (index: number) => {
    setTrips((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert(
        {
          user_uid: user.sub,
          travel: {
            trips,
            narrative
          }
        },
        { onConflict: 'user_uid' }
      );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Travel & Places</h1>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {trips.map((trip, index) => (
        <div key={index} className="border p-4 rounded mb-4 space-y-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700">Destination</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="City, country, or region"
            value={trip.destination || ''}
            onChange={(e) => handleChange(index, 'destination', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Trip Type</label>
          <select
            className="w-full border p-2 rounded"
            value={trip.type || ''}
            onChange={(e) => handleChange(index, 'type', e.target.value)}
          >
            <option value="">Select one</option>
            {tripTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <label className="block text-sm font-medium text-gray-700">When was it?</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="Year or season"
            value={trip.date || ''}
            onChange={(e) => handleChange(index, 'date', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">How often do you take trips like this?</label>
          <select
            className="w-full border p-2 rounded"
            value={trip.frequency || ''}
            onChange={(e) => handleChange(index, 'frequency', e.target.value)}
          >
            <option value="">Select one</option>
            {frequencyOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            className="w-full border p-2 rounded"
            rows={2}
            value={trip.notes || ''}
            onChange={(e) => handleChange(index, 'notes', e.target.value)}
          />

          <button
            onClick={() => removeTrip(index)}
            className="text-sm text-red-600 underline"
          >
            Remove this trip
          </button>
        </div>
      ))}

      <div className="space-y-4">
        <button
          onClick={addTrip}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded"
        >
          Add a Trip
        </button>

        <label className="block text-sm font-medium text-gray-700">
          Anything else I should know about your travel habits or experiences?
        </label>
        <textarea
          rows={4}
          className="w-full border p-2 rounded"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </main>
  );
}