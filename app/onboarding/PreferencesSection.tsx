'use client';

import { useState, useEffect } from 'react';

export default function PreferencesSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    communication_style: '',
    tone_preference: '',
    uses_humor: false,
    uses_swearing: false,
    disliked_phrases: '',
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
        These answers help shape the way your assistant talks — including tone, word choice, and what to avoid.
      </p>

      <input
        placeholder="How do you prefer to communicate? (e.g. direct and efficient)"
        value={formState.communication_style}
        onChange={(e) => updateField('communication_style', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Preferred tone (e.g. playful, serious, motivational)"
        value={formState.tone_preference}
        onChange={(e) => updateField('tone_preference', e.target.value)}
        className="w-full p-2 border"
      />

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formState.uses_humor}
          onChange={(e) => updateField('uses_humor', e.target.checked)}
        />
        <span className="text-sm">I often use humor</span>
      </label>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formState.uses_swearing}
          onChange={(e) => updateField('uses_swearing', e.target.checked)}
        />
        <span className="text-sm">I’m okay with swearing</span>
      </label>

      <textarea
        placeholder="Any words, phrases, or tones you dislike? (e.g. 'buddy', over-apologizing)"
        value={formState.disliked_phrases}
        onChange={(e) => updateField('disliked_phrases', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}