'use client';

import { useEffect, useState } from 'react';

interface SkillSectionProps {
  existingData?: any;
}

export default function SkillSection({ existingData }: SkillSectionProps) {
  const [formState, setFormState] = useState({
    writing: 0,
    cooking: 0,
    sports: 0,
    tech: 0
  });

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (existingData) {
      setFormState(existingData);
      setIsEditing(false);
      setCollapsed(true);
      setStatus('saved');
    }
  }, [existingData]);

  const handleSave = async () => {
    setStatus('saving');
    const res = await fetch('/api/save-section?field=skillsync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formState })
    });

    if (res.ok) {
      setStatus('saved');
      setCollapsed(true);
      setIsEditing(false);
    } else {
      setStatus('error');
    }
  };

  const update = (field: string, value: number) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setStatus('idle');
  };

  if (collapsed && !isEditing) {
    return (
      <div className="flex justify-end">
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {['writing', 'cooking', 'sports', 'tech'].map((skill) => (
        <div key={skill} className="space-y-1">
          <label className="block font-medium capitalize">{skill}</label>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={formState[skill as keyof typeof formState]}
            onChange={(e) => update(skill, parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
            Level: {(formState[skill as keyof typeof formState]) + 1}/5
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {status === 'saving'
            ? 'Saving...'
            : status === 'saved'
            ? 'Saved!'
            : 'Save'}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600 mt-2">Failed to save. Please try again.</p>
      )}
    </div>
  );
}