'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface Person {
  name: string;
  relationship: string;
  birthday?: string;
  isLiving?: boolean;
  notes?: string;
  address?: string;
  howMet?: string;
  seeFrequency?: string;
}

interface SectionProps {
  existingData?: Person[];
}

const intro = `Let’s talk about the people in your life — family, friends, partners, coworkers.
The ones who matter, the ones who show up, the ones you care about (even if it’s complicated).`;

export default function PeopleSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [people, setPeople] = useState<Person[]>(() => Array.isArray(existingData) ? [...existingData] : []);
  const [step, setStep] = useState(-1);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const isComplete = step >= people.length;

  useEffect(() => {
    const currentName = people[step]?.name;
    const text = step === -1
      ? intro
      : step < people.length && currentName && currentName.length > 0
        ? `Tell me about ${currentName}.`
        : step < people.length
          ? `Tell me about this person.`
          : 'That’s everyone for now. You can always add more later.';
  
    indexRef.current = 0;
    setTyping('');
    setShowDots(true);
  
    const delay = setTimeout(() => {
      setShowDots(false);
  
      const type = () => {
        if (indexRef.current < text.length) {
          setTyping((prev) => prev + text.charAt(indexRef.current));
          indexRef.current++;
          setTimeout(type, 60); // Same speed, but controlled
        }
      };
  
      type();
    }, 900);
  
    return () => clearTimeout(delay);
  }, [step, people]);
    indexRef.current = 0;
    setTyping('');
    setShowDots(true);

    const delay = setTimeout(() => {
      setShowDots(false);
      const interval = setInterval(() => {
        if (indexRef.current < text.length) {
          setTyping((prev) => prev + text[indexRef.current]);
          indexRef.current++;
        } else {
          clearInterval(interval);
        }
      }, 60);
    }, 900);

    return () => clearTimeout(delay);
  }, [step, people]);

  const handleChange = <K extends keyof Person>(index: number, field: K, value: Person[K]) => {
    setPeople((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPerson = () => {
    setPeople((prev) => {
      const updated = [...prev, { name: '', relationship: '', isLiving: true }];
      setStep(updated.length - 1);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, people }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">People in Your Life</h1>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      {step === -1 && (
        <button
          onClick={addPerson}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Someone
        </button>
      )}

      {step >= 0 && step < people.length && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Relationship</label>
          <select
            className="w-full border p-2 rounded"
            value={people[step].relationship || ''}
            onChange={(e) => handleChange(step, 'relationship', e.target.value)}
          >
            <option value="">Select relationship</option>
            <option value="Spouse">Spouse</option>
            <option value="Partner">Partner</option>
            <option value="Parent">Parent</option>
            <option value="Sibling">Sibling</option>
            <option value="Child">Child</option>
            <option value="Friend">Friend</option>
            <option value="Coworker">Coworker</option>
            <option value="Pet">Pet</option>
            <option value="It’s complicated">It’s complicated</option>
            <option value="Other">Other</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="Name"
            value={people[step].name || ''}
            onChange={(e) => handleChange(step, 'name', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={people[step].birthday || ''}
            onChange={(e) => handleChange(step, 'birthday', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">Address (optional)</label>
          <input
            className="w-full border p-2 rounded"
            placeholder="Address"
            value={people[step].address || ''}
            onChange={(e) => handleChange(step, 'address', e.target.value)}
          />

          <label className="block text-sm font-medium text-gray-700">How did you meet?</label>
          <select
            className="w-full border p-2 rounded"
            value={people[step].howMet || ''}
            onChange={(e) => handleChange(step, 'howMet', e.target.value)}
          >
            <option value="">Select one</option>
            <option value="Through family">Through family</option>
            <option value="School or university">School or university</option>
            <option value="Work">Work</option>
            <option value="Online">Online</option>
            <option value="Social gathering">Social gathering</option>
            <option value="Other">Other</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">How often do you see them?</label>
          <select
            className="w-full border p-2 rounded"
            value={people[step].seeFrequency || ''}
            onChange={(e) => handleChange(step, 'seeFrequency', e.target.value)}
          >
            <option value="">Select frequency</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="A few times a year">A few times a year</option>
            <option value="Rarely">Rarely</option>
            <option value="Haven’t seen in years">Haven’t seen in years</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Are they living?</label>
            <input
              type="checkbox"
              checked={people[step].isLiving ?? true}
              onChange={(e) => handleChange(step, 'isLiving', e.target.checked)}
            />
          </div>

          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            className="w-full border p-2 rounded"
            placeholder="Any notes, details, or reminders about them..."
            value={people[step].notes || ''}
            onChange={(e) => handleChange(step, 'notes', e.target.value)}
          />

          <div className="flex justify-between mt-4">
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
        </div>
      )}

      {isComplete && (
        <div className="space-y-4">
          <button
            onClick={addPerson}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Add Another Person
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );

}
