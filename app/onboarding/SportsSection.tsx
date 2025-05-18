'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface SportEntry {
  sport?: string;
  team?: string;
  fandomLevel?: string;
  followFrequency?: string;
  attendsLive?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: {
    sportsList?: SportEntry[];
    narrative?: string;
  };
}

const intro = `Let’s talk sports — teams, leagues, athletes, or even just big events you love watching. 
This helps me connect the dots, use better analogies, and reference the stuff that actually excites you. 
You're not sharing this — you're storing it for yourself so I can reflect your world better.`;

const sportOptions = [
  'NFL',
  'NBA',
  'MLB',
  'NHL',
  'MLS',
  'College Football',
  'College Basketball',
  'UFC / MMA',
  'Tennis',
  'Golf',
  'F1',
  'Boxing',
  'Olympics',
  'eSports',
  'Other'
];

const fandomOptions = [
  'Die-hard',
  'Lifelong fan',
  'Casual viewer',
  'Used to follow closely',
  'Former athlete',
  'Other'
];

const frequencyOptions = [
  'Every game or match',
  'Weekly updates',
  'Big events only',
  'Rarely now, but used to'
];

const liveAttendanceOptions = [
  'Yes, regularly',
  'Sometimes',
  'Only big games',
  'Prefer watching alone',
  'Not really'
];

export default function SportsSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [sportsList, setSportsList] = useState<SportEntry[]>(existingData?.sportsList || []);
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

  const handleChange = (index: number, key: keyof SportEntry, value: string) => {
    setSportsList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const addSport = () => {
    setSportsList((prev) => [...prev, {}]);
  };

  const removeSport = (index: number) => {
    setSportsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        sports: {
          sportsList,
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
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Teams & Sports</h1>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {sportsList.map((entry, index) => (
        <div key={index} className="border border-gray-200 rounded p-4 mb-6 space-y-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700">Which sport?</label>
            <select
              className="w-full border p-2 rounded"
              value={entry.sport || ''}
              onChange={(e) => handleChange(index, 'sport', e.target.value)}
            >
              <option value="">Select a sport</option>
              {sportOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Team you follow</label>
            <input
              className="w-full border p-2 rounded"
              placeholder="e.g. NY Giants, LA Lakers"
              value={entry.team || ''}
              onChange={(e) => handleChange(index, 'team', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Level of fandom</label>
            <select
              className="w-full border p-2 rounded"
              value={entry.fandomLevel || ''}
              onChange={(e) => handleChange(index, 'fandomLevel', e.target.value)}
            >
              <option value="">Select one</option>
              {fandomOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">How often do you follow it?</label>
            <select
              className="w-full border p-2 rounded"
              value={entry.followFrequency || ''}
              onChange={(e) => handleChange(index, 'followFrequency', e.target.value)}
            >
              <option value="">Select one</option>
              {frequencyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Do you go to live games?</label>
            <select
              className="w-full border p-2 rounded"
              value={entry.attendsLive || ''}
              onChange={(e) => handleChange(index, 'attendsLive', e.target.value)}
            >
              <option value="">Select one</option>
              {liveAttendanceOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              className="w-full border p-2 rounded"
              rows={2}
              value={entry.notes || ''}
              onChange={(e) => handleChange(index, 'notes', e.target.value)}
            />
          </div>

          <button
            onClick={() => removeSport(index)}
            className="text-sm text-red-600 underline"
          >
            Remove this sport
          </button>
        </div>
      ))}

      <div className="space-y-4">
        <button
          onClick={addSport}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded"
        >
          Add a Sport
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Any final thoughts or stories related to sports that you'd want remembered?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
          />
        </div>

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