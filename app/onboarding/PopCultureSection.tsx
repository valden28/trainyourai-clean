'use client';

import { useEffect, useState } from 'react';

interface PopCultureSectionProps {
  existingData?: any;
}

export default function PopCultureSection({ existingData }: PopCultureSectionProps) {
  const [formState, setFormState] = useState({
    music: '',
    movies: '',
    tv: '',
    sports: ''
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
    const res = await fetch('/api/save-section?field=popculture', {
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
        <label className="block font-medium">Music Preferences</label>
        <input
          value={formState.music}
          onChange={(e) => update('music', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Movies or Genres</label>
        <input
          value={formState.movies}
          onChange={(e) => update('movies', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">TV Shows / Streaming</label>
        <input
          value={formState.tv}
          onChange={(e) => update('tv', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block font-medium">Sports</label>
        <input
          value={formState.sports}
          onChange={(e) => update('sports', e.target.value)}
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