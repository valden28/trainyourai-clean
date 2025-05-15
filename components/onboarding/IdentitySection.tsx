'use client';

import { useState, useEffect } from 'react';

export default function IdentitySection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    full_name: '',
    nickname: '',
    gender: '',
    location: '',
    hometown: '',
    profession: '',
    bio: '',
  });

  useEffect(() => {
    onUpdate(formState);
  }, [formState]);

  const updateField = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 italic">This section helps your assistant understand who you are, your background, and how to speak in a way that feels natural and personal.</p>

      <input placeholder="Full Name" value={formState.full_name} onChange={(e) => updateField('full_name', e.target.value)} className="w-full p-2 border" />
      <input placeholder="Nickname" value={formState.nickname} onChange={(e) => updateField('nickname', e.target.value)} className="w-full p-2 border" />
      <input placeholder="Gender" value={formState.gender} onChange={(e) => updateField('gender', e.target.value)} className="w-full p-2 border" />
      <input placeholder="Location" value={formState.location} onChange={(e) => updateField('location', e.target.value)} className="w-full p-2 border" />
      <input placeholder="Hometown" value={formState.hometown} onChange={(e) => updateField('hometown', e.target.value)} className="w-full p-2 border" />
      <input placeholder="Profession" value={formState.profession} onChange={(e) => updateField('profession', e.target.value)} className="w-full p-2 border" />
      <textarea placeholder="Short Bio" value={formState.bio} onChange={(e) => updateField('bio', e.target.value)} className="w-full p-2 border" />
    </div>
  );
}