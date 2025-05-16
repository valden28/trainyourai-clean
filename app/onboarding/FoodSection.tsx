'use client';

import { useEffect, useState } from 'react';

interface FoodSectionProps {
  existingData?: any;
}

export default function FoodSection({ existingData }: FoodSectionProps) {
  const [formState, setFormState] = useState({
    favorites: '',
    allergies: '',
    diet: '',
    caffeine: '',
    alcohol: ''
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
    const res = await fetch('/api/save-section?field=food', {
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
        <label className="block font-medium">Favorite Foods or Meals</label>
        <input
          value={formState.favorites}
          onChange={(e) => update('favorites', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Allergies</label>
        <input
          value={formState.allergies}
          onChange={(e) => update('allergies', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Diet Type (e.g. Vegan, Keto, etc.)</label>
        <input
          value={formState.diet}
          onChange={(e) => update('diet', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Caffeine Habits</label>
        <input
          value={formState.caffeine}
          onChange={(e) => update('caffeine', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Alcohol Habits</label>
        <input
          value={formState.alcohol}
          onChange={(e) => update('alcohol', e.target.value)}
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