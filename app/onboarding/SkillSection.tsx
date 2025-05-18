'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface SkillData {
  label: string;
  score: number;
}

interface SectionProps {
  existingData?: {
    skills?: SkillData[];
    narrative?: string;
  };
}

const intro = `Let’s map out your skill set and confidence levels.
This helps me know where you want fast answers, step-by-step support, or deeper explanations — and where you might want to grow.`;

const skillSet: string[] = [
  'Writing & Communication',
  'Math & Numbers',
  'Technology & Devices',
  'Health & Wellness Knowledge',
  'Science & Nature',
  'DIY & Repairs',
  'Cooking & Food Knowledge',
  'Financial Topics',
  'People Skills / Social Intelligence',
  'Organization & Planning',
  'Pop Culture & Entertainment',
  'Sports Knowledge',
  'Legal Topics',
  'Nutrition',
  'Accounting & Taxes'
];

const scoreLabels = [
  'Beginner',
  'Learning',
  'Comfortable',
  'Proficient',
  'Confident / Can teach it'
];

export default function SkillSyncSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [skills, setSkills] = useState<SkillData[]>(
    existingData?.skills || skillSet.map((label) => ({ label, score: 3 }))
  );
  const [narrative, setNarrative] = useState(existingData?.narrative || '');
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const currentSkill = skills[step];

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

  const handleSliderChange = (value: number) => {
    setSkills((prev) => {
      const updated = [...prev];
      updated[step].score = value;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        skillsync: {
          skills,
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
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Skills & Confidence</h1>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {step < skills.length ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            How confident are you with: {currentSkill.label}?
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={currentSkill.score}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600 text-right italic">
            {scoreLabels[currentSkill.score - 1]}
          </div>

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
            Anything else you want me to know about your strengths or learning goals?
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
      )}
    </main>
  );
}