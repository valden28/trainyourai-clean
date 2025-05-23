// File: /lib/brain/chefBrain.ts (vector search query handler)

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function queryChefBrain(query: string) {
  try {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });

    const embedding = embeddingRes.data[0].embedding;

    const { data, error } = await supabase.rpc('match_chef_brain', {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 8
    });

    if (error) {
      console.error('[CHEF BRAIN MATCH ERROR]', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[CHEF BRAIN QUERY ERROR]', err);
    return [];
  }
}