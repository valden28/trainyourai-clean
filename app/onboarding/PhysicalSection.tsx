'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface Physical {
  gender?: string;
  height?: string;
  build?: string;
  eyeColor?: string;
  hairColor?: string;
  style?: string;
  tattoos?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: Physical;
}

const intro = ` Let’s talk about how you look — your physical attributes, style, and presence. This info helps personalize how your assistant sees you and describes you if needed.`;

export default function PhysicalAttributesSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<Physical>(existingData || {});
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

  const handleChange = <K extends keyof Physical>(field: K, value: Physical[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, physical: form }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Physical Attributes</h1>
      <p className="text-sm text-gray-600 mb-6">
        How you present yourself — gender, style, height, features — shapes how others perceive you. Sharing this helps your assistant understand how you see yourself and how you want to be described.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Gender or Identity</label>
        <input
          className="w-full border p-2 rounded"
          value={form.gender || ''}
          onChange={(e) => handleChange('gender', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Height</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. 6'1, 170cm"
          value={form.height || ''}
          onChange={(e) => handleChange('height', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Build / Frame</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. athletic, lean, stocky"
          value={form.build || ''}
          onChange={(e) => handleChange('build', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Eye Color</label>
        <input
          className="w-full border p-2 rounded"
          value={form.eyeColor || ''}
          onChange={(e) => handleChange('eyeColor', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Hair Color or Style</label>
        <input
          className="w-full border p-2 rounded"
          value={form.hairColor || ''}
          onChange={(e) => handleChange('hairColor', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Style or Wardrobe</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. casual, designer, sporty"
          value={form.style || ''}
          onChange={(e) => handleChange('style', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Tattoos / Distinct Features</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. full sleeve, nose ring, birthmark"
          value={form.tattoos || ''}
          onChange={(e) => handleChange('tattoos', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
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