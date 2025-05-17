'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

export default function TypewriterPage() {
  const { user } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [typing, setTyping] = useState('');
  const [saving, setSaving] = useState(false);

  const questions = [
    { id: 'nickname', label: 'Do you have a nickname?', type: 'text' },
    { id: 'hometown', label: 'Where did you grow up?', type: 'text' },
    { id: 'birthplace', label: 'Where were you born?', type: 'dropdown', options: ['Tampa', 'Port Charlotte', 'Sarasota', 'Other'] },
    { id: 'bio', label: 'How would you describe your background in a few sentences?', type: 'textarea' },
  ];

  const current = questions[step];
  const isLast = step === questions.length - 1;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!current?.label) return;
    let i = 0;
    setTyping('');
    timeout = setInterval(() => {
      setTyping((prev) => prev + current.label[i]);
      i++;
      if (i >= current.label.length) clearInterval(timeout);
    }, 45);
    return () => clearInterval(timeout);
  }, [step]);

  const handleChange = (e: any) => {
    setAnswers({ ...answers, [current.id]: e.target.value });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const res = await fetch('/api/save-innerview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.sub, innerview: answers }),
    });
    if (res.ok) router.push('/chat-core');
    else alert('Save failed');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Getting to Know You</h1>

      <div className="mb-4 h-24">
        <p className="text-lg font-medium min-h-[48px]">{typing}</p>

        {current?.type === 'text' && (
          <input
            className="w-full border p-2 rounded mt-4"
            value={answers[current.id] || ''}
            onChange={handleChange}
          />
        )}
        {current?.type === 'textarea' && (
          <textarea
            className="w-full border p-2 rounded mt-4"
            rows={4}
            value={answers[current.id] || ''}
            onChange={handleChange}
          />
        )}
        {current?.type === 'dropdown' && (
          <select
            className="w-full border p-2 rounded mt-4"
            value={answers[current.id] || ''}
            onChange={handleChange}
          >
            <option value="">Select one</option>
            {(current.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="px-4 py-2 bg-gray-300 text-black rounded disabled:opacity-50"
        >
          Back
        </button>
        {!isLast ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Finish & Save'}
          </button>
        )}
      </div>
    </main>
  );
}