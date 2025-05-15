'use client';

import { useState, useEffect } from 'react';

const predefinedSkills = [
  'Cooking',
  'Writing',
  'Public Speaking',
  'Sports & Fitness',
  'Gardening',
  'DIY / Home Projects',
  'Technology',
  'Leadership',
  'Business Strategy',
  'Parenting',
  'Health & Wellness',
  'Finance',
  'Education & Teaching',
  'Sales / Persuasion',
  'Conflict Resolution',
];

const labels = ['Novice', 'Comfortable', 'Proficient', 'Advanced', 'Expert'];

export default function SkillsSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState<Record<string, number>>({});

  useEffect(() => {
    onUpdate(formState);
  }, [formState]);

  const updateSkill = (skill: string, level: number) => {
    setFormState((prev) => ({ ...prev, [skill]: level }));
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 italic">
        Your assistant will use this info to gauge how deeply to explain things — or when to challenge or simplify — based on your self-assessed strengths.
      </p>

      {predefinedSkills.map((skill) => (
        <div key={skill} className="space-y-2">
          <label className="block font-medium">{skill}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={formState[skill] || 3}
            onChange={(e) => updateSkill(skill, parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
            {labels[(formState[skill] || 3) - 1]} ({formState[skill] || 3}/5)
          </div>
        </div>
      ))}
    </div>
  );
}