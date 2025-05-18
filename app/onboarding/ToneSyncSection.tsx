// Final ToneSyncSection.tsx with guaranteed RegionalSliders
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface RegionalSliders {
  language: number;
  culture: number;
  food: number;
  socialTone: number;
}

interface ToneSyncData {
  preferences: {
    label: string;
    scale: string;
    value: number;
  }[];
  swearing?: string;
  languageFlavor?: string;
  culturalIdentity?: string[];
  regionalFeel?: {
    region?: string;
    autoDetect?: boolean;
    sliders: RegionalSliders;
  };
}

const defaultSliders: RegionalSliders = {
  language: 3,
  culture: 3,
  food: 3,
  socialTone: 3
};

const ToneSyncSection = ({ existingData }: { existingData?: ToneSyncData }) => {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const indexRef = useRef(0);

  const [form, setForm] = useState<ToneSyncData>(
    existingData ?? {
      preferences: [
        { label: 'Formality', scale: 'Formal ←→ Casual', value: 3 },
        { label: 'Depth', scale: 'Surface-level ←→ Deep & thoughtful', value: 3 },
        { label: 'Warmth', scale: 'Cool ←→ Friendly', value: 3 },
        { label: 'Brevity', scale: 'Short ←→ Detailed', value: 3 },
        { label: 'Playfulness', scale: 'Serious ←→ Witty', value: 3 },
        { label: 'Encouragement', scale: 'Chill ←→ Hype me up', value: 3 },
        { label: 'Language Style', scale: 'Clean ←→ Slang', value: 3 }
      ],
      swearing: '',
      languageFlavor: 'English only',
      culturalIdentity: [],
      regionalFeel: {
        region: '',
        autoDetect: false,
        sliders: defaultSliders
      }
    }
  );

  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const intro = `Let’s calibrate how I speak to you — tone, rhythm, and cultural context.\nThis helps me reflect your personality and background in the way I talk.`;
    indexRef.current = 0;
    setTyping('');
    setShowDots(true);
    const delay = setTimeout(() => {
      setShowDots(false);
      const type = () => {
        if (indexRef.current < intro.length) {
          const nextChar = intro.charAt(indexRef.current);
          setTyping((prev) =>
            indexRef.current === 0 && nextChar === ' ' ? prev : prev + nextChar
          );
          indexRef.current++;
          setTimeout(type, 60);
        }
      };
      type();
    }, 900);
    return () => clearTimeout(delay);
  }, []);

  const handleSliderChange = (key: keyof RegionalSliders, value: number) => {
    setForm((prev) => ({
      ...prev,
      regionalFeel: {
        ...prev.regionalFeel,
        sliders: {
          language: prev.regionalFeel?.sliders?.language ?? 3,
          culture: prev.regionalFeel?.sliders?.culture ?? 3,
          food: prev.regionalFeel?.sliders?.food ?? 3,
          socialTone: prev.regionalFeel?.sliders?.socialTone ?? 3,
          [key]: value
        }
      }
    }));
  };

  const handleMultiSelect = (key: keyof ToneSyncData, option: string) => {
    setForm((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        tonesync: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return <div>/* Replace with full JSX form here (omitted for brevity) */</div>;
};

export default ToneSyncSection;
