'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const skillFields = [
  { key: 'writing', label: 'Writing' },
  { key: 'research', label: 'Research' },
  { key: 'coding', label: 'Coding' },
  { key: 'business', label: 'Business Strategy' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'education', label: 'Education / Teaching' },
  { key: 'organization', label: 'Organization / Planning' },
  { key: 'content_creation', label: 'Content Creation' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'health', label: 'Health & Wellness' },
  { key: 'math', label: 'Math / Logic' },
  { key: 'sports', label: 'Sports / Coaching' },
];

export default function SkillSyncPage() {
  const router = useRouter();
  const [skillsync, setSkillsync] = useState(
    Object.fromEntries(skillFields.map(({ key }) => [key, 3]))
  );
  const [loading, setLoading] = useState(false);

  const handleSliderChange = (key: string, value: number) => {
    setSkillsync((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsync }),
      });

      if (!res.ok) throw new Error('Vault patch failed');

      router.push('/dashboard');
    } catch (err) {
      console.error('SkillSync error:', err);
      alert('There was an issue saving your skills.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-black bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">SkillSync</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {skillFields.map(({ key, label }) => (
          <div key={key}>
            <label className="block font-medium mb-1">
              {label}: {skillsync[key]}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={skillsync[key]}
              onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
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
          {loading ? 'Saving...' : 'Save and Return to Dashboard'}
        </button>
      </form>
    </div>
  );
}