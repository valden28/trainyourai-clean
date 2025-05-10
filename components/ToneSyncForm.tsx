import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient'
interface ToneSyncMap {
  [trait: string]: string[];
}

export default function ToneSyncForm() {
  const [toneMap, setToneMap] = useState<ToneSyncMap | null>(null);
  const [selections, setSelections] = useState<{ [trait: string]: number }>({});

  useEffect(() => {
    async function fetchToneMap() {
      const { data, error } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'toneSync_mapping')
        .single();

      if (error) {
        console.error('Error loading ToneSync map:', error);
      } else {
        setToneMap(data.value);
      }
    }

    fetchToneMap();
  }, []);

  const handleSliderChange = (trait: string, value: number) => {
    setSelections(prev => ({ ...prev, [trait]: value }));
  };

  const handleSubmit = async () => {
    const user = await supabase.auth.getUser();

    if (!user?.data?.user?.email) {
      alert("User not logged in.");
      return;
    }

    const { error } = await supabase
      .from('vaults_test')
      .update({ tonesync: selections })
      .eq('user_email', user.data.user.email);

    if (error) {
      console.error('Failed to save ToneSync:', error);
      alert('Something went wrong saving your tone.');
    } else {
      alert('Tone preferences saved!');
    }
  };

  if (!toneMap) return <p>Loading ToneSync...</p>;

  const categories = [
    {
      name: 'Delivery Style',
      blurb: 'How your AI sounds on the surface—energy, formality, pace, and more.',
      traits: ['formality', 'energy', 'pace', 'swearing', 'voice_style']
    },
    {
      name: 'Social Tone',
      blurb: 'Emotional presence and interpersonal rhythm.',
      traits: ['empathy', 'humor', 'friendliness', 'supportiveness', 'curiosity', 'engagement_style']
    },
    {
      name: 'Communication Approach',
      blurb: 'How your AI structures ideas and delivers clarity.',
      traits: ['directness', 'confidence', 'simplicity', 'agreement', 'clarity_preference']
    },
    {
      name: 'Creativity & Expression',
      blurb: 'How imaginative, expressive, or pop-savvy your assistant sounds.',
      traits: ['creativity', 'analogy_use', 'tone_playfulness', 'expressiveness', 'cultural_flavor']
    }
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-600">
        These sliders let you shape how your assistant communicates. Want a relaxed, witty tone or direct, no-nonsense delivery? You decide.
      </p>

      {categories.map(category => (
        <div key={category.name}>
          <h2 className="text-lg font-semibold mb-1">{category.name}</h2>
          <p className="text-sm text-gray-500 mb-4">{category.blurb}</p>

          {category.traits.map(trait => (
            <div key={trait} className="mb-6">
              <label className="block font-medium capitalize mb-1">{trait.replace(/_/g, ' ')}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={selections[trait] ?? 3}
                onChange={e => handleSliderChange(trait, parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-600 mt-1">
                {toneMap[trait]?.[selections[trait] ? selections[trait] - 1 : 2]}
              </p>
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Save Tone Preferences
      </button>
    </div>
  );
}