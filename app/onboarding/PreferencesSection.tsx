'use client';

import { useEffect, useState } from 'react';

interface PreferencesSectionProps {
  existingData?: any;
}

export default function PreferencesSection({ existingData }: PreferencesSectionProps) {
  const [formState, setFormState] = useState({
    communication: '',
    tone: '',
    dislikes: ''
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
    const res = await fetch('/api/save-section?field=preferences', {
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

  const update = (field: string, value: string) => {
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
    <div className="space-y-4">
      <div>
        <label className="block font-medium">Preferred Communication Style</label>
        <input
          value={formState.communication}
          onChange={(e) => update('communication', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Tone Preference</label>
        <input
          value={formState.tone}
          onChange={(e) => update('tone', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Phrases or Behaviors You Dislike</label>
        <input
          value={formState.dislikes}
          onChange={(e) => update('dislikes', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

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