'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const questions = [
  { id: 'full_name', label: 'What is your full name?', type: 'text' },
  { id: 'nickname', label: 'Do you go by any nickname?', type: 'text' },
  { id: 'birthplace', label: 'Where were you born?', type: 'dropdown', options: ['Tampa', 'Port Charlotte', 'Sarasota', 'Other'] },
  { id: 'hometown', label: 'Where did you grow up?', type: 'dropdown', options: ['Tampa', 'Port Charlotte', 'Sarasota', 'Other'] },
  { id: 'bio', label: 'How would you describe your background in a few sentences?', type: 'textarea' },
];

export default function TypewriterOnboarding() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [typing, setTyping] = useState('');
  const [saving, setSaving] = useState(false);

  const current = questions[step];
  const isLast = step === questions.length - 1;

  // Typewriter animation
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    setTyping('');
    if (current?.label) {
      let i = 0;
      timeout = setInterval(() => {
        setTyping((prev) => prev + current.label[i]);
        i++;
        if (i >= current.label.length) clearInterval(timeout);
      }, 20);
    }
    return () => clearInterval(timeout);
  }, [step]);

  const handleChange = (e: any) => {
    setAnswers({ ...answers, [current.id]: e.target.value });
  };

  const handleNext = () => {
    if (step < questions.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    setAnswers({ ...answers, [current.id]: '' });
    handleNext();
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
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Getting to Know You</h1>

      <div className="mb-4 h-24">
        <p className="text-lg font-medium min-h-[48px]">{typing}</p>

        {current && (
          <>
            {current.type === 'text' && (
              <input
                className="w-full border p-2 rounded mt-4"
                value={answers[current.id] || ''}
                onChange={handleChange}
              />
            )}
            {current.type === 'textarea' && (
              <textarea
                className="w-full border p-2 rounded mt-4"
                rows={4}
                value={answers[current.id] || ''}
                onChange={handleChange}
              />
            )}
            {current.type === 'dropdown' && (
              <select
                className="w-full border p-2 rounded mt-4"
                value={answers[current.id] || ''}
                onChange={handleChange}
              >
                <option value="">Select one</option>
                {current.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="px-4 py-2 bg-gray-300 text-black rounded disabled:opacity-50"
        >
          Back
        </button>
        {!isLast ? (
          <>
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm text-gray-500 underline"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          </>
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

      <div className="flex justify-center mt-4 gap-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i === step ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </main>
  );
}