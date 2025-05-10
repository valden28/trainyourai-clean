'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PreferencesPage() {
  const router = useRouter();
  const [user_uid, setUserUid] = useState('');
  const [favoriteFoods, setFavoriteFoods] = useState('');
  const [favoriteDrinks, setFavoriteDrinks] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [preferredCuisines, setPreferredCuisines] = useState('');
  const [alcoholComfort, setAlcoholComfort] = useState(false);
  const [morningVsNight, setMorningVsNight] = useState(3);
  const [techComfort, setTechComfort] = useState(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/save-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_uid,
        favorite_foods: favoriteFoods,
        favorite_drinks: favoriteDrinks,
        dietary_restrictions: dietaryRestrictions,
        preferred_cuisines: preferredCuisines,
        alcohol_comfort: alcoholComfort,
        morning_vs_night: morningVsNight,
        tech_comfort: techComfort,
      }),
    });

    const data = await res.json();
    if (data.success) {
      router.push('/onboarding/worldview'); // next step
    } else {
      alert('Error saving preferences.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Food, Drink & Lifestyle Preferences</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          placeholder="User UID"
          className="w-full p-2 border rounded"
          value={user_uid}
          onChange={(e) => setUserUid(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Favorite foods"
          className="w-full p-2 border rounded"
          value={favoriteFoods}
          onChange={(e) => setFavoriteFoods(e.target.value)}
        />

        <input
          type="text"
          placeholder="Favorite drinks"
          className="w-full p-2 border rounded"
          value={favoriteDrinks}
          onChange={(e) => setFavoriteDrinks(e.target.value)}
        />

        <input
          type="text"
          placeholder="Dietary restrictions"
          className="w-full p-2 border rounded"
          value={dietaryRestrictions}
          onChange={(e) => setDietaryRestrictions(e.target.value)}
        />

        <input
          type="text"
          placeholder="Preferred cuisines (comma separated)"
          className="w-full p-2 border rounded"
          value={preferredCuisines}
          onChange={(e) => setPreferredCuisines(e.target.value)}
        />

        <div className="flex items-center justify-between border p-3 rounded">
          <span className="font-medium">Okay with Alcohol?</span>
          <button
            type="button"
            onClick={() => setAlcoholComfort(!alcoholComfort)}
            className={`px-4 py-1 rounded-full text-white transition ${
              alcoholComfort ? 'bg-green-600' : 'bg-gray-400'
            }`}
          >
            {alcoholComfort ? 'Yes' : 'No'}
          </button>
        </div>

        <div>
          <label className="block font-medium mb-1">Morning vs. Night: {morningVsNight}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={morningVsNight}
            onChange={(e) => setMorningVsNight(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-500 flex justify-between">
            <span>Morning</span>
            <span>Flexible</span>
            <span>Night Owl</span>
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Tech Comfort Level: {techComfort}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={techComfort}
            onChange={(e) => setTechComfort(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-500 flex justify-between">
            <span>Beginner</span>
            <span>Comfortable</span>
            <span>Expert</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
        >
          Save and Continue
        </button>
      </form>
    </div>
  );
}