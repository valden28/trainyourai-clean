'use client';

import { useState, useEffect } from 'react';

export default function DatesSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    birthdays: '',
    anniversaries: '',
    milestones: '',
    remind_me: false,
  });

  useEffect(() => {
    onUpdate(formState);
  }, [formState]);

  const updateField = (key: string, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600 italic">
        Important dates help your assistant remember and proactively support you in meaningful moments — birthdays, anniversaries, milestones, and more.
      </p>

      <textarea
        placeholder="Birthdays (e.g. Cece - Aug 5, Melissa - Jan 22)"
        value={formState.birthdays}
        onChange={(e) => updateField('birthdays', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Anniversaries (e.g. Wedding - May 10, Donato’s Launch - 1995)"
        value={formState.anniversaries}
        onChange={(e) => updateField('anniversaries', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Personal Milestones (e.g. Sobriety - July 4, First Marathon - Oct 2022)"
        value={formState.milestones}
        onChange={(e) => updateField('milestones', e.target.value)}
        className="w-full p-2 border"
      />

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formState.remind_me}
          onChange={(e) => updateField('remind_me', e.target.checked)}
        />
        <span className="text-sm">Allow the assistant to remind me about these</span>
      </label>
    </div>
  );
}