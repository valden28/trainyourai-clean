'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface Sport {
  team?: string;
  league?: string;
  level?: string;
  frequency?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: Sport[];
}

const intro = ` Let’s talk about the teams and sports you follow — or play. Whether you're a casual fan or all-in, it helps shape how you connect with others.`;

export default function SportsSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [sports, setSports] = useState<Sport[]>(() =>
    Array.isArray(existingData) ? [...existingData] : []
  );
  const [step, setStep] = useState(-1);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const isComplete = step >= sports.length;

  useEffect(() => {
    const currentTeam = sports[step]?.team;
    const rawText =
      step === -1
        ? intro
        : step < sports.length && currentTeam
        ? ` Tell me about your connection to ${currentTeam}.`
        : step < sports.length
        ? ` Tell me about this team or sport.`
        : ` That’s it for now — but you can always add more later.`;

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
  }, [step, sports]);

  const handleChange = <K extends keyof Sport>(
    index: number,
    field: K,
    value: Sport[K]
  ) => {
    setSports((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSport = () => {
    setSports((prev) => {
      const updated = [...prev, {}];
      setStep(updated.length - 1);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, sports }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Teams & Sports</h1>
      <p className="text-sm text-gray-600 mb-6">
        Whether you're a lifelong fan, a casual follower, or a former athlete — your sports interests help shape your energy, identity, and what gets you fired up. Teams, leagues, hometown loyalty — all of it gives your assistant better context for conversation and personalization.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      {step === -1 && (
        <button
          onClick={addSport}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add a Team or Sport
        </button>
      )}

      {step >= 0 && step < sports.length && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Team / Sport Name</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="e.g. Red Sox, Tennis, etc."
            value={sports[step].team || ''}
            onChange={(e) => handleChange(step, 'team', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">League or Organization</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="e.g. MLB, Premier League, NCAA, etc."
            value={sports[step].league || ''}
            onChange={(e) => handleChange(step, 'league', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Level of Fandom</label>
          <select
            className="w-full border p-2 rounded"
            value={sports[step].level || ''}
            onChange={(e) => handleChange(step, 'level', e.target.value)}
          >
            <option value="">Select one</option>
            <option value="Die-hard">Die-hard</option>
            <option value="Lifelong fan">Lifelong fan</option>
            <option value="Casual viewer">Casual viewer</option>
            <option value="Used to follow closely">Used to follow closely</option>
            <option value="Former athlete">Former athlete</option>
            <option value="Other">Other</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">How often do you follow this sport or team?</label>
          <select
            className="w-full border p-2 rounded"
            value={sports[step].frequency || ''}
            onChange={(e) => handleChange(step, 'frequency', e.target.value)}
          >
            <option value="">Select frequency</option>
            <option value="Every game or match">Every game or match</option>
            <option value="Weekly or regular updates">Weekly or regular updates</option>
            <option value="Big events only (e.g. playoffs, tournaments)">Big events only</option>
            <option value="Rarely now, but used to">Rarely now, but used to</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            className="w-full border p-2 rounded"
            placeholder="Any connection, history, or favorite moments to note..."
            value={sports[step].notes || ''}
            onChange={(e) => handleChange(step, 'notes', e.target.value)}
          />

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
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
      )}

      {isComplete && (
        <div className="space-y-4">
          <button
            onClick={addSport}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Add Another
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );
}