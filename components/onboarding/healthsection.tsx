'use client';

import { useState, useEffect } from 'react';

export default function HealthSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    conditions: '',
    medications: '',
    surgeries: '',
    doctor: '',
    family_history: '',
    activity_level: '',
    fitness_routine: '',
    health_goals: '',
    sleep_quality: '',
    wearables: '',
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
        This section helps your assistant understand your health context — whether it's fitness, conditions, routines, or long-term goals.
      </p>

      <textarea
        placeholder="Medical conditions (e.g. diabetes, asthma)"
        value={formState.conditions}
        onChange={(e) => updateField('conditions', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Medications (names, dosage, purpose)"
        value={formState.medications}
        onChange={(e) => updateField('medications', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Past surgeries or procedures (optional)"
        value={formState.surgeries}
        onChange={(e) => updateField('surgeries', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Primary care doctor (name and location, optional)"
        value={formState.doctor}
        onChange={(e) => updateField('doctor', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Family medical history (anything relevant)"
        value={formState.family_history}
        onChange={(e) => updateField('family_history', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Activity level (e.g. sedentary, active, high-performance)"
        value={formState.activity_level}
        onChange={(e) => updateField('activity_level', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Fitness or movement routine (gym, walking, sports, etc.)"
        value={formState.fitness_routine}
        onChange={(e) => updateField('fitness_routine', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Health goals (e.g. lose weight, more energy, manage blood pressure)"
        value={formState.health_goals}
        onChange={(e) => updateField('health_goals', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Sleep quality / schedule"
        value={formState.sleep_quality}
        onChange={(e) => updateField('sleep_quality', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Wearables or health tracking tools (optional)"
        value={formState.wearables}
        onChange={(e) => updateField('wearables', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}