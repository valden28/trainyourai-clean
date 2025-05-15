'use client';

import { useState, useEffect } from 'react';

export default function PeopleInYourLifeSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    spouse: '',
    children: '',
    parents: '',
    siblings: '',
    pets: '',
    contacts: '',
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
        This section helps your assistant understand who matters in your life — your loved ones, your pets, even close contacts. This enables emotional tone, memory, and relevance in responses.
      </p>

      <input
        placeholder="Spouse / Partner"
        value={formState.spouse}
        onChange={(e) => updateField('spouse', e.target.value)}
        className="w-full p-2 border"
      />
      <textarea
        placeholder="Children (e.g. Bella, 17; Cece, 25, Irish dancer in Sarasota)"
        value={formState.children}
        onChange={(e) => updateField('children', e.target.value)}
        className="w-full p-2 border"
      />
      <input
        placeholder="Parents"
        value={formState.parents}
        onChange={(e) => updateField('parents', e.target.value)}
        className="w-full p-2 border"
      />
      <input
        placeholder="Siblings"
        value={formState.siblings}
        onChange={(e) => updateField('siblings', e.target.value)}
        className="w-full p-2 border"
      />
      <textarea
        placeholder="Pets (e.g. Maisel, 4yo red toy poodle, anxious)"
        value={formState.pets}
        onChange={(e) => updateField('pets', e.target.value)}
        className="w-full p-2 border"
      />
      <textarea
        placeholder="Friends / Contacts (names, notes, phone/email, city — anything helpful)"
        value={formState.contacts}
        onChange={(e) => updateField('contacts', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}