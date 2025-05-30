"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
dotenv_1.default.config();
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function embedAndUpload(filePath, source) {
    const fullText = fs_1.default.readFileSync(filePath, 'utf-8');
    const chunks = fullText.match(/[^\n]{100,1000}(\n|$)/g) || [];
    for (const chunk of chunks) {
        const trimmed = chunk.trim();
        if (!trimmed)
            continue;
        const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: trimmed
        });
        const embedding = embeddingRes.data[0].embedding;
        const { error } = await supabase.from('chef_brain').insert({
            assistant_id: 'chef',
            topic: path_1.default.basename(filePath, '.txt'),
            source,
            content: trimmed,
            embedding
        });
        if (error) {
            console.error('Supabase insert error:', error);
        }
        else {
            console.log(`Uploaded chunk from ${filePath}`);
        }
    }
}
async function run() {
    const folder = path_1.default.resolve(__dirname, '../chef-knowledge');
    console.log('[DEBUG] __dirname:', __dirname);
    console.log('[DEBUG] Resolved folder path:', folder);
    if (!fs_1.default.existsSync(folder)) {
        throw new Error('chef-knowledge folder not found.');
    }
    const files = fs_1.default.readdirSync(folder).filter((f) => f.endsWith('.txt'));
    for (const file of files) {
        const filePath = path_1.default.join(folder, file);
        await embedAndUpload(filePath, 'custom_upload');
    }
    console.log('All files processed.');
}
run().catch((err) => {
    console.error('[LOAD SCRIPT ERROR]', err);
});
