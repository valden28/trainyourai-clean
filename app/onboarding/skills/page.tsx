'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const skills = [
  { key: 'writing', label: 'Writing' },
  { key: 'research', label: 'Research' },
  { key: 'coding', label: 'Coding' },
  { key: 'business', label: 'Business Strategy' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'education', label: 'Education / Teaching' },
  { key: 'organization', label: 'Organization' },
  { key: 'content_creation', label: 'Content Creation' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'health', label: 'Health / Wellness' },
  { key: 'math', label: 'Math / Logic' },
  { key: 'sports', label: 'Sports Knowledge' },
];

export default function SkillsPage() {
  const router = useRouter();
  const [user_uid, setUserUid] = useState('');
  const [values, setValues] = useState(
    Object.fromEntries(skills.map(({ key }) => [key, 3]))
  );

  const handleSlider = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/save-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_uid, ...values }),
    });

    const data = await res.json();
    if (data.success) {
      router.push('/onboarding/next-step'); // Replace when next step is live
    } else {
      alert('Error saving skill preferences.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">SkillSync</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          placeholder="User UID"
          className="w-full p-2 border rounded"
          value={user_uid}
          onChange={(e) => setUserUid(e.target.value)}
          required
        />

        {skills.map(({ key, label }) => (
          <div key={key}>
            <label className="block font-medium mb-1">
              {label}: {values[key]}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={values[key]}
              onChange={(e) => handleSlider(key, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-gray-500 flex justify-between">
              <span>Novice</span>
              <span>Comfortable</span>
              <span>Expert</span>
            </div>
          </div>
        ))}

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