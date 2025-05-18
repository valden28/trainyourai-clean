'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface SportsData {
  favoriteTeam?: string;
  favoriteSport?: string;
  levelOfFandom?: string;
  frequencyOfFollowing?: string;
  liveEvents?: string;
  favoriteAthletes?: string;
  personalConnection?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: SportsData;
}

const intro = ` Let’s talk about sports and teams — whether you're a lifelong fan, a casual follower, or somewhere in between.`;

const questions = [
  { key: 'favoriteTeam', label: 'Do you have a favorite team?' },
  { key: 'favoriteSport', label: 'What sport(s) do you follow most?' },
  {
    key: 'levelOfFandom',
    label: 'How would you describe your level of fandom?',
    type: 'dropdown',
    options: [
      'Die-hard',
      'Lifelong fan',
      'Casual viewer',
      'Used to follow closely',
      'Former athlete',
      'Other'
    ]
  },
  {
    key: 'frequencyOfFollowing',
    label: 'How often do you follow this sport or team?',
    type: 'dropdown',
    options: [
      'Every game or match',
      'Weekly updates',
      'Big events only',
      'Rarely now, but used to'
    ]
  },
  {
    key: 'liveEvents',
    label: 'Do you go to live games or watch with others?',
    type: 'dropdown',
    options: [
      'Yes, regularly',
      'Sometimes',
      'Only big games',
      'Prefer watching alone',
      'Not really'
    ]
  },
  { key: 'favoriteAthletes', label: 'Any athletes or sports figures you admire?' },
  {
    key: 'personalConnection',
    label: 'Any personal connection to sports — like childhood memories, rituals, or routines?'
  }
];

export default function SportsSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [formData, setFormData] = useState<SportsData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const currentQuestion = questions[step];

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

  const handleChange = (key: keyof SportsData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, sports: formData }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Teams & Sports</h1>
      <p className="text-sm text-gray-600 mb-6">
        Whether you’re loyal to a team, love a certain sport, or just catch the big events — it says something about you. This helps me bring up the right moments, use analogies you’ll enjoy, or just speak your language a little better. And remember: you’re not sharing this with me — you’re storing it for yourself.
      </p>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {step < questions.length ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">{currentQuestion.label}</label>
          {currentQuestion.type === 'dropdown' ? (
            <select
              className="w-full border p-2 rounded"
              value={formData[currentQuestion.key as keyof SportsData] || ''}
              onChange={(e) =>
                handleChange(currentQuestion.key as keyof SportsData, e.target.value)
              }
            >
              <option value="">Select one</option>
              {currentQuestion.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              rows={3}
              className="w-full border p-2 rounded"
              value={formData[currentQuestion.key as keyof SportsData] || ''}
              onChange={(e) =>
                handleChange(currentQuestion.key as keyof SportsData, e.target.value)
              }
            />
          )}
          <div className="flex justify-between mt-4">
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
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
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Any final thoughts or stories related to sports that you'd want remembered?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={formData.narrative || ''}
            onChange={(e) => handleChange('narrative', e.target.value)}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );
}