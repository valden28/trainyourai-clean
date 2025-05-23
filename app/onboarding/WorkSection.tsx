'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface WorkData {
  title?: string;
  employer?: string;
  industry?: string;
  schedule?: string;
  ownsBusiness?: string;
  businessName?: string;
  businessType?: string;
  businessSize?: string;
  wantsHelp?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: WorkData;
}

const intro = `Let’s capture your current role and pace — whether you’re working, studying, parenting, or running your own thing.
This helps me know what kind of responsibilities you’re juggling, and how I can support you with work-related tasks.`;

const industries = [
  'Education', 'Technology', 'Finance', 'Healthcare', 'Food & Hospitality',
  'Construction', 'Design', 'Retail', 'Logistics', 'Entertainment', 'Other'
];

const schedules = [
  '9 to 5', 'Shift-based', 'Freelance / variable', 'Nights / weekends',
  'I set my own hours', 'I’m not currently working'
];

const helpOptions = [
  'Yes, proactively', 'Only when I ask', 'Not at all', 'Let’s see what works'
];

const businessSizes = [
  'Just me', '2–5 people', '6–20 people', '21–50 people', 'Over 50 people'
];

export default function WorkSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<WorkData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const questions = [
    { key: 'title', label: 'What’s your current job title or role?' },
    { key: 'employer', label: 'Who do you work for (or study under)?' },
    { key: 'industry', label: 'What field or industry are you in?', type: 'dropdown', options: industries },
    { key: 'schedule', label: 'What’s your current schedule like?', type: 'dropdown', options: schedules },
    { key: 'ownsBusiness', label: 'Do you also own or run your own business?', type: 'dropdown', options: ['Yes', 'No'] },
    { key: 'businessName', label: 'What’s your business called?', condition: (form: WorkData) => form.ownsBusiness === 'Yes' },
    { key: 'businessType', label: 'What does your business do?', condition: (form: WorkData) => form.ownsBusiness === 'Yes' },
    { key: 'businessSize', label: 'Roughly how many people work with you?', type: 'dropdown', options: businessSizes, condition: (form: WorkData) => form.ownsBusiness === 'Yes' },
    { key: 'wantsHelp', label: 'Do you want me to support you with work-related tasks?', type: 'dropdown', options: helpOptions }
  ];

  const current = questions[step];

  useEffect(() => {
    const rawText = intro;
    indexRef.current = 0;
    setTyping('');
    setShowDots(true);
    const delay = setTimeout(() => {
      setShowDots(false);
      const type = () => {
        if (indexRef.current < rawText.length) {
          const nextChar = rawText.charAt(indexRef.current);
          setTyping((prev) =>
            indexRef.current === 0 && nextChar === ' ' ? prev : prev + nextChar
          );
          indexRef.current++;
          setTimeout(type, 60);
        }
      };
      type();
    }, 900);
    return () => clearTimeout(delay);
  }, []);

  const handleChange = <K extends keyof WorkData>(key: K, value: WorkData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        work: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  const shouldShow = !current.condition || current.condition(form);

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Work & Role</h1>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {step < questions.length && shouldShow ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">{current.label}</label>

          {'options' in current && current.type === 'dropdown' ? (
            <select
              className="w-full border p-2 rounded"
              value={form[current.key as keyof WorkData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof WorkData, e.target.value)
              }
            >
              <option value="">Select one</option>
              {current.options!.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : (
            <textarea
              rows={3}
              className="w-full border p-2 rounded"
              value={form[current.key as keyof WorkData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof WorkData, e.target.value)
              }
            />
          )}

          <div className="flex justify-between mt-4">
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
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
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Anything else I should know about your work life or responsibilities?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={form.narrative || ''}
            onChange={(e) => handleChange('narrative', e.target.value)}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );
}