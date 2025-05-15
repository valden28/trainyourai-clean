'use client';

import { useState, useEffect } from 'react';

export default function WorkSection({ onUpdate }: { onUpdate: (data: any) => void }) {
  const [formState, setFormState] = useState({
    job_title: '',
    employer: '',
    salary_range: '',
    responsibilities: '',
    current_projects: '',
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
        Work is often a huge part of who you are. This section helps your assistant give relevant advice, understand your schedule, and talk to you in context.
      </p>

      <input
        placeholder="Job Title"
        value={formState.job_title}
        onChange={(e) => updateField('job_title', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Employer / Company"
        value={formState.employer}
        onChange={(e) => updateField('employer', e.target.value)}
        className="w-full p-2 border"
      />

      <input
        placeholder="Salary Range (optional)"
        value={formState.salary_range}
        onChange={(e) => updateField('salary_range', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="What are your main responsibilities?"
        value={formState.responsibilities}
        onChange={(e) => updateField('responsibilities', e.target.value)}
        className="w-full p-2 border"
      />

      <textarea
        placeholder="What are you currently working on or focused on?"
        value={formState.current_projects}
        onChange={(e) => updateField('current_projects', e.target.value)}
        className="w-full p-2 border"
      />
    </div>
  );
}