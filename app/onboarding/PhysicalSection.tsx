'use client';

import { useEffect, useState } from 'react';

interface PhysicalSectionProps {
  existingData?: any;
}

export default function PhysicalSection({ existingData }: PhysicalSectionProps) {
  const [formState, setFormState] = useState({
    height: '',
    weight: '',
    clothing: '',
    fit: ''
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
    const res = await fetch('/api/save-section?field=physical', {
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
        <label className="block font-medium">Height</label>
        <input
          value={formState.height}
          onChange={(e) => update('height', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Weight</label>
        <input
          value={formState.weight}
          onChange={(e) => update('weight', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Clothing Sizes</label>
        <input
          value={formState.clothing}
          onChange={(e) => update('clothing', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Fit Preferences</label>
        <input
          value={formState.fit}
          onChange={(e) => update('fit', e.target.value)}
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