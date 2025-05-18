'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface SkillEntry {
  label: string;
  confidence: number;
}

interface SectionProps {
  existingData?: SkillEntry[];
}

const intro = ` Let’s rate your comfort level with different skills — from everyday tasks to creative strengths.`;

const defaultSkills: SkillEntry[] = [
  { label: 'Writing / Communication', confidence: 3 },
  { label: 'Math / Numbers', confidence: 3 },
  { label: 'Explaining Complex Topics', confidence: 3 },
  { label: 'Cooking / Food Prep', confidence: 3 },
  { label: 'DIY / Home Repair', confidence: 3 },
  { label: 'Health / Wellness Knowledge', confidence: 3 },
  { label: 'Business Strategy', confidence: 3 },
  { label: 'Creative Thinking', confidence: 3 },
  { label: 'Organizing Information', confidence: 3 },
  { label: 'Teaching / Coaching Others', confidence: 3 }
];

export default function SkillSyncSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [skills, setSkills] = useState<SkillEntry[]>(
    existingData && Array.isArray(existingData) && existingData.length > 0
      ? existingData
      : defaultSkills
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

  const handleConfidenceChange = (index: number, value: number) => {
    setSkills((prev) => {
      const updated = [...prev];
      updated[index].confidence = value;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, skillsync: skills }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Skills & Confidence</h1>
      <p className="text-sm text-gray-600 mb-6">
        Your skillset influences how your assistant helps you — whether it’s teaching, supporting, or getting out of your way. Use these sliders to rate your comfort with different types of tasks or knowledge.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-6">
        {skills.map((skill, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{skill.label}</label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={skill.confidence}
              onChange={(e) => handleConfidenceChange(index, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-600 text-right">
              {['Novice', 'Beginner', 'Comfortable', 'Proficient', 'Expert'][skill.confidence - 1]}
            </div>
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