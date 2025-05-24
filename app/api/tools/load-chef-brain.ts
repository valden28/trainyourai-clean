import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ...rest of your code continues here

async function embedAndUpload(filePath: string, source: string) {
  const fullText = fs.readFileSync(filePath, 'utf-8');
  const chunks = fullText.match(/[^\n]{100,1000}(\n|$)/g) || [];

  for (const chunk of chunks) {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk.trim()
    });

    const embedding = embeddingRes.data[0].embedding;

    const { error } = await supabase.from('chef_brain').insert({
      assistant_id: 'chef',
      topic: path.basename(filePath, '.txt'),
      source,
      content: chunk.trim(),
      embedding
    });

    if (error) {
      console.error('Supabase insert error:', error);
    } else {
      console.log(`Uploaded chunk from ${filePath}`);
    }
  }
}

async function run() {
  const folder = path.join(__dirname, 'chef-knowledge');
  if (!fs.existsSync(folder)) {
    throw new Error('chef-knowledge folder not found.');
  }

  const files = fs.readdirSync(folder).filter(f => f.endsWith('.txt'));

  for (const file of files) {
    const filePath = path.join(folder, file);
    await embedAndUpload(filePath, 'custom_upload');
  }

  console.log('All files processed.');
}

run();