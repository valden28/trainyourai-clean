'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface WorkData {
  currentTitle?: string;
  currentCompany?: string;
  industry?: string;
  seniority?: string;
  goals?: string;
  sideProjects?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: WorkData;
}

const intro = ` Let’s talk about your work — what you do, what you lead, or what you’re building.`;

export default function WorkSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<WorkData>(existingData || {});
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

  const handleChange = <K extends keyof WorkData>(field: K, value: WorkData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, work: form }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Work & Role</h1>
      <p className="text-sm text-gray-600 mb-6">
        Your professional world shapes how you think, communicate, and spend your time. Whether you're leading a team, building a brand, managing people, or planning what’s next — this context helps your assistant support you in the ways that matter.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Current Role / Job Title</label>
        <input
          className="w-full border p-2 rounded"
          value={form.currentTitle || ''}
          onChange={(e) => handleChange('currentTitle', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Company or Organization</label>
        <input
          className="w-full border p-2 rounded"
          value={form.currentCompany || ''}
          onChange={(e) => handleChange('currentCompany', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Industry or Field</label>
        <input
          className="w-full border p-2 rounded"
          value={form.industry || ''}
          onChange={(e) => handleChange('industry', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Career Stage or Seniority</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. entry-level, mid-career, founder, retired"
          value={form.seniority || ''}
          onChange={(e) => handleChange('seniority', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Work-Related Goals</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={2}
          placeholder="What are you building, aiming for, or planning?"
          value={form.goals || ''}
          onChange={(e) => handleChange('goals', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Side Projects or Other Work</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={2}
          placeholder="Freelance work, volunteer roles, businesses, etc."
          value={form.sideProjects || ''}
          onChange={(e) => handleChange('sideProjects', e.target.value)}
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