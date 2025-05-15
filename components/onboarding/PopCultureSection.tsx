'use client';

import { useState, useEffect } from 'react';

export default function PopCultureSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    favorite_music: '',
    favorite_movies: '',
    favorite_tv: '',
    streaming_platforms: '',
    sports_teams: '',
    pop_culture_genres: '',
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
        Your taste in music, shows, and entertainment gives your assistant better cultural references and helps it connect with you more naturally.
      </p>

      <textarea
        placeholder="Favorite music (artists, genres, playlists)"
        value={formState.favorite_music}
        onChange={(e) => updateField('favorite_music', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Favorite movies (genres, all-time favorites)"
        value={formState.favorite_movies}
        onChange={(e) => updateField('favorite_movies', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Favorite TV shows or streaming series"
        value={formState.favorite_tv}
        onChange={(e) => updateField('favorite_tv', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Streaming platforms you use (e.g. Netflix, Hulu, YouTube)"
        value={formState.streaming_platforms}
        onChange={(e) => updateField('streaming_platforms', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Sports teams you follow (optional)"
        value={formState.sports_teams}
        onChange={(e) => updateField('sports_teams', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="Pop culture genres you enjoy (e.g. comedy, sci-fi, crime, drama)"
        value={formState.pop_culture_genres}
        onChange={(e) => updateField('pop_culture_genres', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}