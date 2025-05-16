'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const introBlurb = `Thanks for sitting down with me.
This is just a chance to get to know you better — not to share anything publicly, just to store what matters privately.
Let’s start with a few basics that help me understand who you are and where you come from.`;

const questions = [
  { id: 'full_name', label: 'Can I get your full name?', type: 'text' },
  { id: 'nickname', label: 'Do your friends or family ever call you something else?', type: 'text', optional: true },
  { id: 'dob', label: 'When were you born?', type: 'date' },
  { id: 'location', label: 'Where do you live now?', type: 'text' },
  { id: 'hometown', label: 'Where did you grow up?', type: 'text' },
  { id: 'ethnicity', label: 'Any cultural background or heritage that’s part of your story?', type: 'tags', options: ['Italian', 'Irish', 'Jewish', 'Cuban', 'Mexican', 'German', 'African American', 'Korean', 'Chinese', 'Indian', 'Puerto Rican', 'Other'] },
  { id: 'languages', label: 'What languages do you speak or understand?', type: 'tags', options: ['English', 'Spanish', 'French', 'German', 'Italian', 'Mandarin', 'Portuguese', 'Other'] },
];

export default function TypewriterIdentity() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = intro
  const [typing, setTyping] = useState('');
  const [answers, setAnswers] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const current = questions[step] || null;

  useEffect(() => {
    let text = step === -1 ? introBlurb : current?.label || '';
    let i = 0;
    setTyping('');

    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        setTyping((prev) => prev + text[i]);
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 65);
    }, 800);

    return () => clearTimeout(delay);
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

  const TagSelector = ({ id, options }: { id: string; options: string[] }) => (
    <select
      multiple
      className="w-full border p-2 rounded mt-4"
      value={answers[id] || []}
      onChange={(e) => {
        const selected = Array.from(e.target.selectedOptions, (o: any) => o.value);
        setAnswers({ ...answers, [id]: selected });
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto flex flex-col font-sans">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Let’s Start with the Basics</h1>

      <div className="min-h-[100px] mb-6">
        <p className="text-lg font-medium whitespace-pre-line leading-relaxed">{typing}</p>
      </div>

      {step === -1 ? (
        <button
          onClick={() => setStep(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded self-start"
        >
          Start
        </button>
      ) : (
        <>
          {current?.type === 'text' && (
            <input
              className="w-full border p-2 rounded mb-6"
              value={answers[current.id] || ''}
              onChange={handleChange}
              placeholder="Type your answer..."
            />
          )}

          {current?.type === 'date' && (
            <input
              type="date"
              className="w-full border p-2 rounded mb-6"
              value={answers[current.id] || ''}
              onChange={handleChange}
            />
          )}

          {current?.type === 'tags' && (
            <TagSelector id={current.id} options={current.options || []} />
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="px-4 py-2 bg-gray-300 text-black rounded disabled:opacity-50"
            >
              Back
            </button>
            {step < questions.length - 1 ? (
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
        </>
      )}
    </main>
  );
}