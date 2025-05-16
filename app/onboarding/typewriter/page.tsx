'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const introBlurb = `Thanks for sitting down with me. The more I understand about you, the better I’ll be at supporting you.
You’re not sharing this info — you’re just storing it privately for your future self to work with.
This section helps me understand your background, identity, and what makes you… you.`;

const questions = [
  { id: 'full_name', label: 'What’s your full name?', type: 'text' },
  { id: 'nickname', label: 'Do people call you anything else? Nicknames, short versions, anything like that?', type: 'text', optional: true },
  { id: 'dob', label: 'When’s your birthday?', type: 'date' },
  { id: 'location', label: 'Where do you live now?', type: 'text' },
  { id: 'hometown', label: 'Where did you grow up?', type: 'text' },
  { id: 'ethnicity', label: 'Is there a cultural background or heritage that’s part of your story?', type: 'tags', options: ['Italian', 'Irish', 'Jewish', 'Cuban', 'Mexican', 'German', 'African American', 'Korean', 'Chinese', 'Indian', 'Puerto Rican', 'Other'] },
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
    if (step === -1) {
      let i = 0;
      setTyping('');
      const delay = setTimeout(() => {
        const interval = setInterval(() => {
          setTyping((prev) => prev + introBlurb[i]);
          i++;
          if (i >= introBlurb.length) clearInterval(interval);
        }, 40);
      }, 500);
      return () => clearTimeout(delay);
    } else if (current?.label) {
      let i = 0;
      setTyping('');
      const delay = setTimeout(() => {
        const interval = setInterval(() => {
          setTyping((prev) => prev + current.label[i]);
          i++;
          if (i >= current.label.length) clearInterval(interval);
        }, 50);
      }, 500);
      return () => clearTimeout(delay);
    }
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
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Let’s Start with the Basics</h1>

      <div className="min-h-[100px] mb-6">
        <p className="text-lg font-medium whitespace-pre-line">{typing}</p>
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