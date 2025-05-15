'use client';

import { useState, useEffect } from 'react';

const toneFields = [
  'humor',
  'energy',
  'formality',
  'confidence',
  'directness'
];

const toneLabels: Record<string, string[]> = {
  humor: ['None', 'Dry', 'Witty', 'Playful', 'Silly'],
  energy: ['Low', 'Relaxed', 'Neutral', 'Energetic', 'High-octane'],
  formality: ['Casual', 'Neutral', 'Formal', 'Very formal', 'Ultra formal'],
  confidence: ['Humble', 'Balanced', 'Assertive', 'Bold', 'Dominant'],
  directness: ['Indirect', 'Subtle', 'Clear', 'Very clear', 'Blunt']
};

export default function ToneSyncSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState<Record<string, number>>({});

  useEffect(() => {
    const formatted = Object.fromEntries(
      Object.entries(formState).map(([field, index]) => [field, toneLabels[field][index] || ''])
    );
    onUpdate(formatted);
  }, [formState]);

  const updateSlider = (field: string, index: number) => {
    setFormState((prev) => ({ ...prev, [field]: index }));
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 italic">
        This helps your assistant match your natural tone — how you like to come across and how you want it to speak.
      </p>

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
    </div>
  );
}