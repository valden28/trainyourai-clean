''use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface Trip {
  destination: string;
  reason?: string;
  date?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: Trip[];
}

const intro = `Let’s talk about the places you’ve been and the trips you’ve taken.
Whether it was for fun, work, family, or escape — they all tell a story.`;

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
    const text =
      step === -1
        ? intro
        : step < trips.length && currentDestination && currentDestination.length > 0
        ? `Tell me about your trip to ${currentDestination}.`
        : step < trips.length
        ? `Tell me about this trip.`
        : `That’s all for now — but you can always add more later.`;

    indexRef.current = 0;
    setTyping('');
    setShowDots(true);

    const delay = setTimeout(() => {
      setShowDots(false);

      // Immediately render the first character
      setTyping(text.charAt(0));
      indexRef.current = 1;

      const type = () => {
        if (indexRef.current < text.length) {
          setTyping((prev) => prev + text.charAt(indexRef.current));
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
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Travel & Places</h1>

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
            placeholder="Where did you go?"
            value={trips[step].destination || ''}
            onChange={(e) => handleChange(step, 'destination', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Purpose of Trip</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="Vacation, work, family, etc."
            value={trips[step].reason || ''}
            onChange={(e) => handleChange(step, 'reason', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={trips[step].date || ''}
            onChange={(e) => handleChange(step, 'date', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            className="w-full border p-2 rounded"
            placeholder="Any highlights or details you want to remember..."
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