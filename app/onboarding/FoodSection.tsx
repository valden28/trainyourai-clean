'use client';

import { useState, useEffect } from 'react';

export default function FoodSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    favorite_foods: '',
    favorite_drinks: '',
    dietary_type: '',
    allergies: '',
    caffeine: '',
    alcohol: '',
    meal_timing: '',
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
        Your food preferences help your assistant understand your routines, recommend meals or drinks, and respect any health-related restrictions.
      </p>

      <textarea
        placeholder="Favorite foods"
        value={formState.favorite_foods}
        onChange={(e) => updateField('favorite_foods', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Favorite drinks (e.g. wine, whiskey, matcha, Red Bull)"
        value={formState.favorite_drinks}
        onChange={(e) => updateField('favorite_drinks', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Dietary type (e.g. vegetarian, keto, low-carb, no restriction)"
        value={formState.dietary_type}
        onChange={(e) => updateField('dietary_type', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Allergies or sensitivities (e.g. gluten, nuts, dairy)"
        value={formState.allergies}
        onChange={(e) => updateField('allergies', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Caffeine habits (e.g. none, coffee only in morning, heavy user)"
        value={formState.caffeine}
        onChange={(e) => updateField('caffeine', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Alcohol habits (e.g. social drinker, none, whiskey on weekends)"
        value={formState.alcohol}
        onChange={(e) => updateField('alcohol', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Meal timing or structure (e.g. intermittent fasting, big dinner)"
        value={formState.meal_timing}
        onChange={(e) => updateField('meal_timing', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}