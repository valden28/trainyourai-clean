'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportantDatesPage() {
  const router = useRouter();
  const [user_uid, setUserUid] = useState('');
  const [birthday, setBirthday] = useState('');
  const [spouseBirthday, setSpouseBirthday] = useState('');
  const [childrenBirthdays, setChildrenBirthdays] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [otherDates, setOtherDates] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/save-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_uid,
        birthday,
        spouse_birthday: spouseBirthday,
        children_birthdays: childrenBirthdays,
        anniversary,
        other_important_dates: otherDates,
      }),
    });

    const data = await res.json();
    if (data.success) {
      router.push('/dashboard'); // Final redirect
    } else {
      alert('Error saving dates.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Important Dates</h1>

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
          type="date"
          placeholder="Your Birthday"
          className="w-full p-2 border rounded"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />

        <input
          type="date"
          placeholder="Spouse Birthday"
          className="w-full p-2 border rounded"
          value={spouseBirthday}
          onChange={(e) => setSpouseBirthday(e.target.value)}
        />

        <textarea
          placeholder="Children's birthdays (e.g., Ava - 2010-05-20, Jake - 2012-09-14)"
          className="w-full p-2 border rounded"
          value={childrenBirthdays}
          onChange={(e) => setChildrenBirthdays(e.target.value)}
        />

        <input
          type="date"
          placeholder="Anniversary"
          className="w-full p-2 border rounded"
          value={anniversary}
          onChange={(e) => setAnniversary(e.target.value)}
        />

        <textarea
          placeholder="Other important dates (name + date + note)"
          className="w-full p-2 border rounded"
          value={otherDates}
          onChange={(e) => setOtherDates(e.target.value)}
        />

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
        >
          Save and Finish
        </button>
      </form>
    </div>
  );
}