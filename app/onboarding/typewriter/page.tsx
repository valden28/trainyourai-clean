'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const introBlurb = `Thanks for sitting down with me.
You're not sharing this info — you're just storing it for your future self.
This section helps me learn the basics: who you are, where you're from, and how to show up for you better.`;

const closingBlurb = `That’s it for the basics. When you're ready, we can move on to the next section or come back later.`;

const questions = [
  { id: 'full_name', label: 'Can I get your full name?', type: 'text' },
  { id: 'nickname', label: 'Do your friends or family call you anything else?', type: 'text' },
  { id: 'dob', label: 'When were you born?', type: 'date' },
  { id: 'location', label: 'Where do you live now?', type: 'text' },
  { id: 'hometown', label: 'Where did you grow up?', type: 'text' },
  { id: 'ethnicity', label: 'Any cultural background or heritage you identify with?', type: 'tags', options: ['Italian', 'Irish', 'Jewish', 'Cuban', 'Mexican', 'German', 'African American', 'Korean', 'Chinese', 'Indian', 'Puerto Rican', 'Other'] },
  { id: 'languages', label: 'What languages do you speak or understand?', type: 'tags', options: ['English', 'Spanish', 'French', 'German', 'Italian', 'Mandarin', 'Portuguese', 'Other'] },
];

export default function TypewriterIdentity() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = intro, questions 0+, final = questions.length
  const [typing, setTyping] = useState('');
  const [answers, setAnswers] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const current = step >= 0 && step < questions.length ? questions[step] : null;
  const isComplete = step >= questions.length;
  const percent = Math.min(100, Math.round(((step + 1) / questions.length) * 100));

  useEffect(() => {
    let text = step === -1 ? introBlurb : isComplete ? closingBlurb : current?.label || '';
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
    if (!current || !current.id) return;
    const updatedAnswers = { ...answers };
    updatedAnswers[current.id] = e.target.value;
    setAnswers(updatedAnswers);
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
      className="w-full border p-3 rounded mt-4"
      value={answers[id] || []}
      onChange={(e) => {
        const selected = Array.from(e.target.selectedOptions, (o: any) => o.value);
        const updatedAnswers = { ...answers };
        updatedAnswers[id] = selected;
        setAnswers(updatedAnswers);
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );

  return (
    <main className="min-h-screen bg-white text-black p-4 sm:p-6 max-w-xl mx-auto flex flex-col font-sans">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-blue-700">Identity</h1>
        {step >= 0 && step < questions.length && (
          <span className="text-sm text-gray-500">{percent}% complete</span>
        )}
      </div>

      <div className="min-h-[100px] mb-6">
        <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
      </div>

      {step === -1 && (
        <button
          onClick={() => setStep(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded self-start"
        >
          Start
        </button>
      )}

      {current && (
        <>
          {current.type === 'text' && (
            <input
              className="w-full border p-3 rounded mb-6"
              value={answers[current.id] || ''}
              onChange={handleChange}
              placeholder="Type your answer..."
            />
          )}
          {current.type === 'date' && (
            <input
              type="date"
              className="w-full border p-3 rounded mb-6"
              value={answers[current.id] || ''}
              onChange={handleChange}
            />
          )}
          {current.type === 'tags' && (
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
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          </div>
        </>
      )}

      {isComplete && (
        <div className="flex flex-col gap-4 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-blue-600 underline"
          >
            Or return to dashboard
          </button>
        </div>
      )}
    </main>
  );
}