'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface WorkData {
  role?: string;
  ownsBusiness?: string;
  businessName?: string;
  businessDescription?: string;
  businessSize?: string;
  industry?: string;
  schedule?: string;
  aiSupportPreference?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: WorkData;
}

const intro = `Let’s capture what you do — or what you’re focused on day to day.
Whether it’s a job, a business, studying, parenting, or something else entirely, this helps me understand your responsibilities, pace, and headspace.`;

const industries = [
  'Education',
  'Technology',
  'Finance',
  'Healthcare',
  'Food & Hospitality',
  'Construction',
  'Design',
  'Retail',
  'Logistics',
  'Entertainment',
  'Other'
];

const schedules = [
  '9 to 5',
  'Shift-based',
  'Freelance / variable',
  'Nights / weekends',
  'I set my own hours',
  'I’m not currently working'
];

const aiSupportOptions = [
  'Yes, proactively',
  'Only when I ask',
  'Not at all',
  'Let’s see what works'
];

const businessSizeOptions = [
  'Just me',
  '2–5 people',
  '6–20 people',
  '21–50 people',
  'Over 50 people'
];

export default function WorkSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<WorkData>(existingData || {});
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

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
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, work: form }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

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

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">What’s your primary role or title right now?</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. Owner, Student, Parent, CTO"
          value={form.role || ''}
          onChange={(e) => handleChange('role', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Do you own or run your own business?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.ownsBusiness || ''}
          onChange={(e) => handleChange('ownsBusiness', e.target.value)}
        >
          <option value="">Select one</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        {form.ownsBusiness === 'Yes' && (
          <>
            <label className="block text-sm font-medium text-gray-700">Business Name</label>
            <input
              className="w-full border p-2 rounded"
              value={form.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700">What does your business do?</label>
            <textarea
              className="w-full border p-2 rounded"
              rows={2}
              value={form.businessDescription || ''}
              onChange={(e) => handleChange('businessDescription', e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700">How many people work with you?</label>
            <select
              className="w-full border p-2 rounded"
              value={form.businessSize || ''}
              onChange={(e) => handleChange('businessSize', e.target.value)}
            >
              <option value="">Select one</option>
              {businessSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </>
        )}

        <label className="block text-sm font-medium text-gray-700">What industry or field are you in?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.industry || ''}
          onChange={(e) => handleChange('industry', e.target.value)}
        >
          <option value="">Select one</option>
          {industries.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">What’s your current work schedule like?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.schedule || ''}
          onChange={(e) => handleChange('schedule', e.target.value)}
        >
          <option value="">Select one</option>
          {schedules.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Do you want me to support you with work-related tasks?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.aiSupportPreference || ''}
          onChange={(e) => handleChange('aiSupportPreference', e.target.value)}
        >
          <option value="">Select one</option>
          {aiSupportOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Anything else I should understand about your work life?</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={3}
          value={form.narrative || ''}
          onChange={(e) => handleChange('narrative', e.target.value)}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </main>
  );
}