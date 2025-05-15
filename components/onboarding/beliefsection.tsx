'use client';

import { useState, useEffect } from 'react';

export default function BeliefsSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    core_values: [] as string[],
    political_view: '',
    religion: '',
    worldview: '',
    boundaries: '',
  });

  useEffect(() => {
    onUpdate(formState);
  }, [formState]);

  const toggleCoreValue = (value: string) => {
    setFormState((prev) => {
      const exists = prev.core_values.includes(value);
      const updated = exists
        ? prev.core_values.filter((v) => v !== value)
        : [...prev.core_values, value];
      return { ...prev, core_values: updated };
    });
  };

  const updateField = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const valuesList = ['Honesty', 'Freedom', 'Compassion', 'Discipline', 'Creativity', 'Justice', 'Faith', 'Growth'];

  return (
    <div className="space-y-4">
      <p className="text-gray-600 italic">
        These inputs help your assistant reflect your moral compass and respect your boundaries in sensitive situations.
      </p>

      <div>
        <label className="block font-medium mb-2">Core Values (select all that apply)</label>
        <div className="grid grid-cols-2 gap-2">
          {valuesList.map((val) => (
            <label key={val} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formState.core_values.includes(val)}
                onChange={() => toggleCoreValue(val)}
              />
              <span>{val}</span>
            </label>
          ))}
        </div>
      </div>

      <input
        placeholder="Political view (optional)"
        value={formState.political_view}
        onChange={(e) => updateField('political_view', e.target.value)}
        className="w-full p-2 border"
      />
      <input
        placeholder="Religious/spiritual belief (optional)"
        value={formState.religion}
        onChange={(e) => updateField('religion', e.target.value)}
        className="w-full p-2 border"
      />
      <textarea
        placeholder="How do you see the world? (worldview, guiding principles)"
        value={formState.worldview}
        onChange={(e) => updateField('worldview', e.target.value)}
        className="w-full p-2 border"
      />
      <textarea
        placeholder="Any personal or conversational boundaries you'd like your assistant to respect?"
        value={formState.boundaries}
        onChange={(e) => updateField('boundaries', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}