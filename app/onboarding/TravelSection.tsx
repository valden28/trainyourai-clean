'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';

const travelQuestions = [
  {
    id: 'frequency',
    label: 'How often do you typically travel?',
    type: 'dropdown',
    options: ['Every week', 'A few times a month', 'A few times a year', 'Rarely', 'Only when I have to']
  },
  {
    id: 'purpose',
    label: 'Why do you usually travel?',
    type: 'tags',
    options: ['Business', 'Vacation', 'Family', 'Events', 'Adventure', 'Reset/recharge', 'Exploration', 'Content/work', 'Other']
  },
  {
    id: 'transport',
    label: 'When you travel, how do you usually get there?',
    type: 'tags',
    options: ['Flying', 'Driving', 'Road trips', 'Trains', 'Cruises', 'Private travel', 'Depends']
  },
  {
    id: 'style',
    label: 'What’s your travel style?',
    type: 'dropdown',
    options: ['Luxury', 'Budget-conscious', 'Spontaneous', 'Very planned', 'Family-focused', 'Nature-based', 'City explorer', 'Homebody with a passport']
  },
  {
    id: 'stress',
    label: 'Do you enjoy travel or does it stress you out?',
    type: 'dropdown',
    options: ['Love it', 'Mixed bag', 'Depends on the situation', 'It’s stressful', 'I’d rather stay home']
  },
  {
    id: 'places_visited',
    label: 'Have you been to any of these places — or do they stand out as meaningful trips?',
    type: 'tags',
    options: ['Italy', 'France', 'Spain', 'Greece', 'Japan', 'Australia', 'Hawaii', 'New York', 'Las Vegas', 'Nashville', 'Mexico', 'Caribbean', 'National Parks', 'Africa', 'Southeast Asia', 'Other']
  },
  {
    id: 'bucket_list',
    label: 'Any destinations you want to visit someday?',
    type: 'tags',
    options: ['Bali', 'Iceland', 'Italy', 'Paris', 'Tokyo', 'Australia', 'Greece', 'London', 'Bora Bora', 'New Zealand', 'Safari in Africa', 'Northern Lights', 'Patagonia', 'Other']
  },
  {
    id: 'preferences',
    label: 'Do you have any preferences when it comes to flying, airports, or hotels?',
    type: 'tags',
    options: ['Window seat', 'Aisle seat', 'Direct flights only', 'Early boarding', 'Lounge access', 'TSA PreCheck', 'Hotel loyalty program', 'Late check-out', 'Quiet hotels', 'Airport anxiety', 'Prefer driving', 'Other']
  }
];

export default function TravelSection() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [typing, setTyping] = useState('');
  const [answers, setAnswers] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const current = travelQuestions[step];
  const isComplete = step >= travelQuestions.length;

  useEffect(() => {
    const text = step === -1
      ? `Let’s talk travel.\nWhether you fly every month or take one big trip a year, how you travel says a lot — where you go, why you go, and how you like to move through the world.\nThis helps me give better suggestions, remember what matters, and avoid what doesn’t.`
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
    await fetch('/api/save-section?field=travel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: answers }),
    });
    if (user?.sub) {
      await updateFamiliarityScore(user.sub);
    }
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Travel</h1>

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
              {current.options?.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {current.type === 'tags' && current.options && (
            <div className="mb-6 flex flex-wrap gap-2">
              {current.options.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleMultiSelect(current.id, opt)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    ((answers[current.id] as string[] | undefined) ?? []).includes(opt)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
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