// File: /scripts/load_brain.ts

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

// 🧠 Config — change 'merv' or 'chef'
const ASSISTANT_ID = 'merv'; // ← CHANGE THIS
const SOURCE_LABEL = 'custom_upload';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,                 // ❗ Not NEXT_PUBLIC
  process.env.SUPABASE_SERVICE_ROLE_KEY!     // ❗ Secure server-only
);

async function embedAndUpload(filePath: string) {
  const fullText = fs.readFileSync(filePath, 'utf-8');
  const chunks = fullText.match(/(.|[\r\n]){100,1000}(?=\s|$)/g) || [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: trimmed,
    });

    const embedding = embeddingRes.data[0].embedding;

    const { error } = await supabase
      .from(`${ASSISTANT_ID}_brain`)
      .insert({
        assistant_id: ASSISTANT_ID,
        topic: path.basename(filePath, '.txt'),
        source: SOURCE_LABEL,
        content: trimmed,
        embedding,
      });

    if (error) {
      console.error(`❌ Error uploading ${filePath}:`, error.message);
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

  console.log(`🧠 Uploading ${files.length} files from ${folder}...`);

  for (const file of files) {
    const filePath = path.join(folder, file);
    await embedAndUpload(filePath);
  }

  console.log('🎉 All chunks processed.');
}

run().catch((err) => {
  console.error('[EMBED UPLOAD FAILED]', err.message);
});