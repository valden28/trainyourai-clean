'use client';

import { useEffect, useState } from 'react';

interface ToneSyncSectionProps {
  existingData?: any;
}

const toneFields = ['humor', 'energy', 'formality', 'confidence', 'directness'];

const toneLabels: Record<string, string[]> = {
  humor: ['None', 'Dry', 'Witty', 'Playful', 'Silly'],
  energy: ['Low', 'Relaxed', 'Neutral', 'Energetic', 'High-octane'],
  formality: ['Casual', 'Neutral', 'Formal', 'Very formal', 'Ultra formal'],
  confidence: ['Humble', 'Balanced', 'Assertive', 'Bold', 'Dominant'],
  directness: ['Indirect', 'Subtle', 'Clear', 'Very clear', 'Blunt']
};

export default function ToneSyncSection({ existingData }: ToneSyncSectionProps) {
  const [formState, setFormState] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (existingData) {
      const formatted = Object.fromEntries(
        Object.entries(existingData).map(([k, v]) => [k, toneLabels[k].indexOf(v as string)])
      );
      setFormState(formatted);
      setIsEditing(false);
      setCollapsed(true);
      setStatus('saved');
    }
  }, [existingData]);

  const handleSave = async () => {
    const formatted = Object.fromEntries(
      Object.entries(formState).map(([field, index]) => [field, toneLabels[field][index]])
    );

    setStatus('saving');
    const res = await fetch('/api/save-section?field=tonesync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formatted })
    });

    if (res.ok) {
      setStatus('saved');
      setCollapsed(true);
      setIsEditing(false);
    } else {
      setStatus('error');
    }
  };

  const updateSlider = (field: string, index: number) => {
    setFormState((prev) => ({ ...prev, [field]: index }));
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
      {toneFields.map((field) => (
        <div key={field} className="space-y-1">
          <label className="block font-medium capitalize">{field}</label>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={formState[field] ?? 2}
            onChange={(e) => updateSlider(field, parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
            {toneLabels[field][formState[field] ?? 2]} ({(formState[field] ?? 2) + 1}/5)
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