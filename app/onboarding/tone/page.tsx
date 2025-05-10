'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const sliderFields = [
  { key: 'formality', label: 'Formality', left: 'Casual', right: 'Formal' },
  { key: 'humor', label: 'Humor', left: 'Dry', right: 'Playful' },
  { key: 'warmth', label: 'Warmth', left: 'Cool', right: 'Affectionate' },
  { key: 'directness', label: 'Directness', left: 'Indirect', right: 'Blunt' },
  { key: 'optimism', label: 'Optimism', left: 'Realistic', right: 'Extremely Positive' },
  { key: 'sarcasm', label: 'Sarcasm', left: 'Literal', right: 'Heavily Sarcastic' },
  { key: 'empathy', label: 'Empathy', left: 'Reserved', right: 'Deeply Empathetic' },
  { key: 'assertiveness', label: 'Assertiveness', left: 'Passive', right: 'Forceful' },
  { key: 'encouragement', label: 'Encouragement', left: 'Subtle', right: 'Enthusiastic' },
  { key: 'simplicity', label: 'Simplicity', left: 'Detailed', right: 'Ultra Simple' },
  { key: 'eloquence', label: 'Eloquence', left: 'Plain', right: 'Artful' },
  { key: 'playfulness', label: 'Playfulness', left: 'Serious', right: 'Whimsical' },
  { key: 'curiosity', label: 'Curiosity', left: 'Minimal', right: 'Highly Inquisitive' },
  { key: 'patience', label: 'Patience', left: 'Blunt', right: 'Exceptionally Patient' },
];

export default function TonePage() {
  const router = useRouter();
  const [user_uid, setUserUid] = useState('');
  const [toneValues, setToneValues] = useState(
    Object.fromEntries(sliderFields.map(({ key }) => [key, 3]))
  );
  const [swearingComfort, setSwearingComfort] = useState(false);

  const handleSliderChange = (key: string, value: number) => {
    setToneValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/save-tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_uid, ...toneValues, swearing_comfort: swearingComfort }),
    });

    const data = await res.json();
    if (data.success) {
      router.push('/onboarding/next-step'); // Change this to your next step route
    } else {
      alert('Error saving tone preferences.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ToneSync Preferences</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          placeholder="User UID"
          className="w-full p-2 border rounded"
          value={user_uid}
          onChange={(e) => setUserUid(e.target.value)}
          required
        />

        {sliderFields.map(({ key, label, left, right }) => (
          <div key={key}>
            <label className="block font-medium mb-1">
              {label}: {toneValues[key]}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={toneValues[key]}
              onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-500 flex justify-between">
              <span>{left}</span>
              <span>{right}</span>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between border p-3 rounded">
          <span className="font-medium">Okay with Swearing?</span>
          <button
            type="button"
            onClick={() => setSwearingComfort(!swearingComfort)}
            className={`px-4 py-1 rounded-full text-white transition ${
              swearingComfort ? 'bg-green-600' : 'bg-gray-400'
            }`}
          >
            {swearingComfort ? 'Yes' : 'No'}
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
        >
          Save and Continue
        </button>
      </form>
    </div>
  );
}