// File: chef_brain_loader/load_brain.ts

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ✅ Load .env variables (must include SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY)
dotenv.config();

// 🧠 Config: change this to 'chef' or 'merv' depending on which brain you're loading
const ASSISTANT_ID = 'chef';
const SOURCE_LABEL = 'custom_upload';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ✅ FIXED: use server-only Supabase variables
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function embedAndUpload(filePath: string) {
  const fullText = fs.readFileSync(filePath, 'utf-8');
  const chunks = fullText.match(/(.|[\r\n]){100,1000}(?=\s|$)/g) || [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: trimmed
    });

    const embedding = embeddingRes.data[0].embedding;

    const { error } = await supabase.from(`${ASSISTANT_ID}_brain`).insert({
      assistant_id: ASSISTANT_ID,
      topic: path.basename(filePath, '.txt'),
      source: SOURCE_LABEL,
      content: trimmed,
      embedding
    });

    if (error) {
      console.error(`❌ Supabase insert error [${filePath}]:`, error.message);
    } else {
      console.log(`✅ Uploaded chunk from ${filePath}`);
    }
  }
}

async function run() {
  const folder = path.resolve(__dirname, `../${ASSISTANT_ID}-knowledge`);

  if (!fs.existsSync(folder)) {
    throw new Error(`❌ Folder not found: ${folder}`);
  }

  const files = fs.readdirSync(folder).filter((f) => f.endsWith('.txt'));

  console.log(`🧠 Loading ${files.length} file(s) from ${folder}...`);

  for (const file of files) {
    const filePath = path.join(folder, file);
    await embedAndUpload(filePath);
  }

  console.log('🎉 All files processed successfully.');
}

run().catch((err) => {
  console.error('[LOAD SCRIPT ERROR]', err.message);
});