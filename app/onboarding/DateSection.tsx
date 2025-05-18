'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface DateEntry {
  label: string;
  date: string;
  notes?: string;
}

interface SectionProps {
  existingData?: DateEntry[];
}

const intro = ` Let’s capture any important dates in your life — birthdays, anniversaries, memorials, holidays, or reminders.`;

export default function DatesSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [entries, setEntries] = useState<DateEntry[]>(() =>
    Array.isArray(existingData) ? [...existingData] : []
  );
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const isComplete = entries.length > 0;

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

  const handleChange = <K extends keyof DateEntry>(
    index: number,
    field: K,
    value: DateEntry[K]
  ) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addDate = () => {
    setEntries((prev) => [...prev, { label: '', date: '' }]);
  };

  const removeDate = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, dates: entries }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Important Dates</h1>
      <p className="text-sm text-gray-600 mb-6">
        These moments can be meaningful milestones — birthdays, anniversaries, losses, or traditions. Logging them helps your assistant acknowledge what matters most on the days that count.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      {entries.map((entry, index) => (
        <div key={index} className="border p-4 rounded mb-4 space-y-3 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700">What is this date?</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="e.g. Mom’s birthday, wedding anniversary, etc."
            value={entry.label}
            onChange={(e) => handleChange(index, 'label', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={entry.date}
            onChange={(e) => handleChange(index, 'date', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            className="w-full border p-2 rounded"
            rows={2}
            value={entry.notes || ''}
            onChange={(e) => handleChange(index, 'notes', e.target.value)}
          />

          <button
            onClick={() => removeDate(index)}
            className="text-sm text-red-600 underline mt-2"
          >
            Remove this date
          </button>
        </div>
      ))}

      <div className="space-y-4 mt-4">
        <button
          onClick={addDate}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded"
        >
          Add a Date
        </button>

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