'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const presetPersonas = [
  'Smart older brother',
  'No-BS coach',
  'Tough-love mentor',
  'Over-the-top hype guy',
  'Chill creative partner',
];

export default function PersonaModePage() {
  const router = useRouter();
  const [persona, setPersona] = useState('');
  const [customPersona, setCustomPersona] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const persona_mode = persona === 'custom' ? customPersona : persona;

    try {
      const res = await fetch('/api/vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_mode }),
      });

      if (!res.ok) throw new Error('Failed to save persona mode');

      router.push('/dashboard');
    } catch (err) {
      console.error('Persona save error:', err);
      alert('Problem saving persona preference.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white text-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Choose Your Persona Mode</h1>
      <p className="mb-6 text-gray-700">
        This adds a fun personality overlay to your AI — it won’t replace your vault training, but
        it will change how the assistant speaks.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {presetPersonas.map((option) => (
          <label key={option} className="block">
            <input
              type="radio"
              name="persona"
              value={option}
              checked={persona === option}
              onChange={() => setPersona(option)}
              className="mr-2"
            />
            {option}
          </label>
        ))}

        <label className="block mt-4">
          <input
            type="radio"
            name="persona"
            value="custom"
            checked={persona === 'custom'}
            onChange={() => setPersona('custom')}
            className="mr-2"
          />
          Other:
        </label>
        {persona === 'custom' && (
          <input
            type="text"
            placeholder="Enter your custom persona..."
            className="w-full p-2 border rounded mt-2"
            value={customPersona}
            onChange={(e) => setCustomPersona(e.target.value)}
          />
        )}

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {loading ? 'Saving...' : 'Save and Continue'}
        </button>
      </form>
    </div>
  );
}