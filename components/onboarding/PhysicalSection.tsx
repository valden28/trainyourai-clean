'use client';

import { useState, useEffect } from 'react';

export default function PhysicalSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    height: '',
    weight: '',
    clothing_sizes: '',
    fit_preferences: '',
  });

  useEffect(() => {
    onUpdate(formState);
  }, [formState]);

  const updateField = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 italic">
        Basic physical info helps your assistant support gift recommendations, fitness insights, and personalized planning.
      </p>

      <input
        <input
        placeholder={'Height (e.g. 5\'10" or 178cm)'}
        value={formState.height}
        onChange={(e) => updateField('height', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Weight (optional)"
        value={formState.weight}
        onChange={(e) => updateField('weight', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Clothing sizes (e.g. L shirt, 34x32 pants, 10.5 shoes)"
        value={formState.clothing_sizes}
        onChange={(e) => updateField('clothing_sizes', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Fit preferences (e.g. loose t-shirts, slim pants, hate tight collars)"
        value={formState.fit_preferences}
        onChange={(e) => updateField('fit_preferences', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}