'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';

const sportsQuestions = [
  {
    id: 'leagues',
    label: 'Do you follow any major sports?',
    type: 'tags',
    options: ['NFL', 'NBA', 'MLB', 'NHL', 'College Football', 'College Basketball', 'Soccer', 'Tennis', 'Golf', 'UFC/MMA', 'Racing', 'None', 'Other']
  },
  {
    id: 'teams',
    label: 'Any teams you root for — teams that actually matter to you?',
    type: 'tags',
    options: ['Yankees', 'Red Sox', 'Cowboys', 'Lakers', 'Warriors', 'Patriots', 'Packers', 'Duke', 'Alabama', 'Man U', 'Barcelona', 'Other']
  },
  {
    id: 'played',
    label: 'Any sports you’ve played, coached, or still play now?',
    type: 'tags',
    options: ['Baseball', 'Basketball', 'Football', 'Soccer', 'Tennis', 'Golf', 'Track/Running', 'Martial Arts', 'Swimming', 'Pickleball', 'Other']
  },
  {
    id: 'viewing_style',
    label: 'Do you usually watch games live, stream them, or just check scores later?',
    type: 'dropdown',
    options: ['Watch live', 'Stream when I can', 'Just check scores', 'Rarely follow']
  },
  {
    id: 'rituals',
    label: 'Anything else I should know about how sports show up in your life — family traditions, rivalries, game-day rules?',
    type: 'text'
  }
];

export default function SportsSection() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [typing, setTyping] = useState('');
  const [answers, setAnswers] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const current = sportsQuestions[step];
  const isComplete = step >= sportsQuestions.length;

  useEffect(() => {
    const text = step === -1
      ? `Let’s talk sports — whether you’re a diehard, casual fan, or just here for the game-day food.\nKnowing who you root for helps me bring the right energy at the right time — or know when not to interrupt.`
      : current?.label || '';

    let i = 0;
    setTyping('');
    const interval = setInterval(() => {
      setTyping((prev) => prev + text[i]);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 35);

    return () => clearInterval(interval);
  }, [step]);

  const handleChange = (e: any) => {
    if (!current?.id) return;
    setAnswers({ ...answers, [current.id]: e.target.value });
  };

  const handleMultiSelect = (id: string, option: string) => {
    const selected = Array.isArray(answers[id]) ? answers[id] : [];
    const updated = selected.includes(option)
      ? selected.filter((item: string) => item !== option)
      : [...selected, option];
    setAnswers({ ...answers, [id]: updated });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await fetch('/api/save-section?field=sports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: answers }),
    });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Sports & Teams</h1>

      <div className="min-h-[100px] mb-6">
        <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
      </div>

      {step === -1 ? (
        <button
          onClick={() => setStep(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Start
        </button>
      ) : !isComplete ? (
        <div>
          {current.type === 'dropdown' && (
            <select
              className="w-full border p-2 rounded mb-6"
              value={answers[current.id] || ''}
              onChange={handleChange}
            >
              <option value="">Select one</option>
              {current.options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {current.type === 'tags' && (
            <div className="mb-6 flex flex-wrap gap-2">
              {current.options.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleMultiSelect(current.id, opt)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    (Array.isArray(answers[current.id]) ? answers[current.id] : []).includes(opt)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {current.type === 'text' && (
            <textarea
              className="w-full border p-2 rounded mb-6"
              rows={3}
              value={answers[current.id] || ''}
              onChange={handleChange}
              placeholder="Type here..."
            />
          )}

          <div className="flex justify-between">
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
      ) : (
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Finish'}
        </button>
      )}
    </main>
  );
}