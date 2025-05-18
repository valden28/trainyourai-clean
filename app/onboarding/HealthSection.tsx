'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface HealthData {
  medicalConditions?: string;
  medications?: string;
  fitnessHabits?: string;
  sleepPattern?: string;
  stressLevel?: string;
  goals?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: HealthData;
}

const intro = ` Let’s talk about your health, lifestyle, and fitness habits — anything that affects your energy, focus, or routine.`;

export default function HealthSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<HealthData>(existingData || {});
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

  const handleChange = <K extends keyof HealthData>(field: K, value: HealthData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, health: form }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Health & Fitness</h1>
      <p className="text-sm text-gray-600 mb-6">
        The goal isn’t to track your vitals — it’s to understand what affects your performance, motivation, and clarity. Whether you’re thriving or managing something, this helps your assistant calibrate.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Medical Conditions (if any)</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. asthma, ADHD, diabetes"
          value={form.medicalConditions || ''}
          onChange={(e) => handleChange('medicalConditions', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Medications or Supplements</label>
        <input
          className="w-full border p-2 rounded"
          value={form.medications || ''}
          onChange={(e) => handleChange('medications', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Fitness or Movement Habits</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. walks, gym, yoga, inactive"
          value={form.fitnessHabits || ''}
          onChange={(e) => handleChange('fitnessHabits', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Sleep Patterns or Challenges</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. 8 hours, inconsistent, insomnia"
          value={form.sleepPattern || ''}
          onChange={(e) => handleChange('sleepPattern', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Stress Level / Mental Load</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. calm, overwhelmed, varies"
          value={form.stressLevel || ''}
          onChange={(e) => handleChange('stressLevel', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Wellness Goals</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={2}
          value={form.goals || ''}
          onChange={(e) => handleChange('goals', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={3}
          value={form.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
        />

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