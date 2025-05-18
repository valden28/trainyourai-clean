'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface PopCultureData {
  favoriteMovie?: string;
  favoriteTV?: string;
  favoriteMusic?: string;
  favoriteBook?: string;
  favoriteCelebrity?: string;
  culturalTouchstone?: string;
  toneInfluence?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: PopCultureData;
}

const intro = ` Let’s talk about your taste in entertainment, music, and pop culture. These preferences shape how you think, express yourself, and connect with the world.`;

const questions = [
  { key: 'favoriteMovie', label: 'What’s a movie you love or always recommend?' },
  { key: 'favoriteTV', label: 'Do you have a favorite show or series you always come back to?' },
  { key: 'favoriteMusic', label: 'Who are your favorite artists or go-to music genres?' },
  { key: 'favoriteBook', label: 'Is there a book or author that shaped you or stuck with you?' },
  { key: 'favoriteCelebrity', label: 'Are there any public figures, actors, or creators you admire?' },
  { key: 'culturalTouchstone', label: 'Is there a piece of pop culture that defined a chapter of your life?' },
  { key: 'toneInfluence', label: 'Does any of this influence the way you speak, joke, or tell stories?' }
];

export default function PopCultureSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [formData, setFormData] = useState<PopCultureData>(existingData || {});
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

  const handleChange = (key: keyof PopCultureData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, popculture: formData }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Pop Culture & Personal Taste</h1>
      <p className="text-sm text-gray-600 mb-6">
        Your cultural preferences shape how you speak, what resonates with you, and how you relate to others. It also helps your assistant reference things that feel familiar to you.
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
          <label className="block text-sm font-medium text-gray-700">
            {currentQuestion.label}
          </label>
          <textarea
            rows={3}
            className="w-full border p-2 rounded"
            value={formData[currentQuestion.key as keyof PopCultureData] || ''}
            onChange={(e) => handleChange(currentQuestion.key as keyof PopCultureData, e.target.value)}
          />
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
            Anything else that helps explain your taste, style, or what shaped you?
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