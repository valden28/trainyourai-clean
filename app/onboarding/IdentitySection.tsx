'use client';

import { useState } from 'react';

export default function IdentitySection() {
  const [formState, setFormState] = useState({
    full_name: '',
    nickname: '',
    age: '',
    gender: '',
    hometown: '',
    location: '',
    bio: '',
    profession: ''
  });

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    const res = await fetch('/api/save-section?field=innerview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: formState })
    });

    if (res.ok) {
      setStatus('saved');
    } else {
      setStatus('error');
    }
  };

  const update = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setStatus('idle');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium">Full Name</label>
        <input value={formState.full_name} onChange={(e) => update('full_name', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Nickname</label>
        <input value={formState.nickname} onChange={(e) => update('nickname', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Age</label>
        <input value={formState.age} onChange={(e) => update('age', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Gender</label>
        <input value={formState.gender} onChange={(e) => update('gender', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Hometown</label>
        <input value={formState.hometown} onChange={(e) => update('hometown', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Current Location</label>
        <input value={formState.location} onChange={(e) => update('location', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Short Bio</label>
        <textarea value={formState.bio} onChange={(e) => update('bio', e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block font-medium">Profession</label>
        <input value={formState.profession} onChange={(e) => update('profession', e.target.value)} className="w-full p-2 border rounded" />
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