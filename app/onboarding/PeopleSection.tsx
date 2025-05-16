'use client';

import { useState } from 'react';

interface PeopleSectionProps {
  onComplete?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function PeopleSection({ onComplete }: PeopleSectionProps) {
  const [formState, setFormState] = useState({
    spouse: '',
    children: '',
    pets: '',
    others: ''
  });

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const handleSave = async () => {
    setStatus('saving');
    const res = await fetch('/api/save-section?field=people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formState })
    });

    if (res.ok) {
      setStatus('saved');
      setCollapsed(true);
      setIsEditing(false);
      if (onComplete) onComplete();
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
        <label className="block font-medium">Spouse / Partner</label>
        <input
          value={formState.spouse}
          onChange={(e) => update('spouse', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block font-medium">Children</label>
        <input
          value={formState.children}
          onChange={(e) => update('children', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block font-medium">Pets</label>
        <input
          value={formState.pets}
          onChange={(e) => update('pets', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block font-medium">Other Important People</label>
        <input
          value={formState.others}
          onChange={(e) => update('others', e.target.value)}
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