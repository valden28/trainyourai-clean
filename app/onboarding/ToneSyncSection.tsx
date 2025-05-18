'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface ToneSetting {
  label: string;
  value: number;
}

interface SectionProps {
  existingData?: ToneSetting[];
}

const intro = ` Let’s tune your assistant’s tone and communication style. These sliders will help it sound more like you — or the way you want it to sound.`;

const defaultToneSettings: ToneSetting[] = [
  { label: 'Formality (Casual → Professional)', value: 3 },
  { label: 'Humor (Dry → Playful)', value: 3 },
  { label: 'Empathy (Neutral → Warm)', value: 3 },
  { label: 'Directness (Soft → Blunt)', value: 3 },
  { label: 'Detail Level (Brief → Elaborate)', value: 3 },
  { label: 'Enthusiasm (Chill → Excited)', value: 3 },
  { label: 'Profanity (Clean → Unfiltered)', value: 2 },
  { label: 'Energy (Slow → Fast-Paced)', value: 3 }
];

export default function ToneSyncSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [settings, setSettings] = useState<ToneSetting[]>(
    existingData && Array.isArray(existingData) && existingData.length > 0
      ? existingData
      : defaultToneSettings
  );

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

  const handleChange = (index: number, value: number) => {
    setSettings((prev) => {
      const updated = [...prev];
      updated[index].value = value;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, tonesync: settings }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Tone & Voice Preferences</h1>
      <p className="text-sm text-gray-600 mb-6">
        Every person has a different tone — and your assistant should reflect yours. These sliders help calibrate how it speaks, explains, jokes, or supports based on your vibe.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-6">
        {settings.map((tone, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{tone.label}</label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={tone.value}
              onChange={(e) => handleChange(index, parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </main>
  );
}