// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';
const DEBUG_LOG = true;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ────────────────────────── Helpers ────────────────────────── */
function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const r = String(m.role || '').toLowerCase();
      const role: 'user' | 'assistant' = r === 'assistant' ? 'assistant' : 'user';
      return { role, content: m.content.trim() };
    });
}

const CONTACT_INTENT = /\b(phone|number|email|contact|employee|staff|manager|gm)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

function extractName(s: string): string | null {
  if (!s) return null;
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];
  const blacklist = new Set(['I','Phone','Number','Email','Sales','Manager','Chef','Merv','Luna']);
  const names = all.filter(w => !blacklist.has(w)).sort((a,b)=>b.length-a.length);
  return names[0] || null;
}

function parseDateSmart(s: string): string | null {
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const us = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) {
    const mm = Number(us[1]); const dd = Number(us[2]);
    let yy = us[3] ? Number(us[3]) : new Date().getFullYear();
    if (yy < 100) yy += 2000;
    const dt = new Date(yy, mm - 1, dd);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  return null;
}

const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357dd496';
/* ────────────────────────── Main Route ────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Body
    const raw = await req.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
    let history = sanitizeHistory(Array.isArray(parsed?.messages) ? parsed.messages : []);
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim())
      history = [{ role: 'user', content: parsed.message.trim() }];
    if (!history.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

    const lastUserMsg = history.slice().reverse().find(m=>m.role==='user')?.content || '';
    if (DEBUG_LOG) console.log('[MERV DEBUG] lastUserMsg:', lastUserMsg);

    // Vault / persona
    let tenant_id: string | null = null;
    try {
      const { data: vault } = await supabase.from('vaults_test').select('*').eq('user_uid', user_uid).single();
      tenant_id = vault?.tenant_id || null;
    } catch {}
    const { data: brain } = await supabase.from('merv_brain').select('prompt').eq('user_uid', user_uid).maybeSingle();
    const basePersona = brain?.prompt || 'You are Merv — grounded, sharp, calibrated.';

    /* ───────────────────── EMPLOYEE LOOKUP ───────────────────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      const nameGuess = extractName(lastUserMsg);
      const cleaned = (nameGuess || lastUserMsg)
        .replace(/(phone|number|email|contact|employee|manager|staff|gm)\b/gi, '')
        .replace(/[^\w' ]+/g, ' ')
        .trim();

      const tokens = cleaned.split(' ').filter(t => t.length > 1);
      if (DEBUG_LOG) console.log('[MERV DEBUG] employee search', { cleaned, tokens });

      const ors: string[] = [];
      tokens.forEach(t => {
        ors.push(`first_name.ilike.%${t}%`);
        ors.push(`last_name.ilike.%${t}%`);
        ors.push(`email.ilike.%${t}%`);
      });

      // Always include the full cleaned string for composite match
      if (cleaned) {
        ors.push(`email.ilike.%${cleaned}%`);
        ors.push(`first_name.ilike.%${cleaned.split(' ')[0]}%`);
      }

      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone')
        .or(ors.join(','))
        .limit(5);

      if (error) {
        console.error('[MERV DEBUG] supabase error', error);
      }
      if (DEBUG_LOG) console.log('[MERV DEBUG] employee hits', employees?.length || 0);

      if (employees && employees.length) {
        const e = employees[0];
        const fullName = [e.first_name, e.last_name].filter(Boolean).join(' ');
        const lines = [
          fullName,
          e.email ? `Email: ${e.email}` : null,
          e.phone ? `Phone: ${e.phone}` : null,
        ].filter(Boolean);
        const reply = lines.join('\n');

        return NextResponse.json({
          text: reply,
          role: 'assistant',
          name: 'Merv',
          content: reply,
          meta: { intent: 'employees', hits: employees.length },
        });
      }

      const notFound = `I couldn’t find ${cleaned || 'that person'} in employees.`;
      return NextResponse.json({
        text: notFound,
        role: 'assistant',
        name: 'Merv',
        content: notFound,
        meta: { intent: 'employees', hits: 0 },
      });
    }

    /* ───────────────────── SALES LOOKUP ───────────────────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);

      const { data: daily } = await supabase
        .from('daily_sales')
        .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
        .eq('date', d)
        .eq('location_id', BANYAN_LOCATION_ID)
        .limit(1);
      let s = daily?.[0];

      if (!s) {
        const { data: legacy } = await supabase
          .from('sales_daily')
          .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('work_date', d)
          .eq('location_id', BANYAN_LOCATION_ID)
          .limit(1);
        if (legacy?.[0])
          s = {
            date: legacy[0].work_date,
            ...legacy[0],
          };
      }

      if (s) {
        const txt =
          `Sales for ${s.date}:\n` +
          `- Net Sales: $${Number(s.net_sales || 0).toFixed(2)}\n` +
          `- Bar Sales: $${Number(s.bar_sales || 0).toFixed(2)}\n` +
          (s.total_tips ? `- Total Tips: $${Number(s.total_tips).toFixed(2)}\n` : '') +
          (s.comps ? `- Comps: ${s.comps}\n` : '') +
          (s.voids ? `- Voids: ${s.voids}\n` : '') +
          (s.deposit ? `- Deposit: ${s.deposit}\n` : '');
        return NextResponse.json({
          text: txt.trim(),
          role: 'assistant',
          name: 'Merv',
          content: txt.trim(),
        });
      }
    }

    /* ───────────────────── DEFAULT → OpenAI ───────────────────── */
    const systemPrompt = `
User Profile Summary:
${tenant_id ? `Tenant ID: ${tenant_id}` : ''}

${basePersona}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '[No reply]';
    return NextResponse.json({ text: reply, role: 'assistant', name: 'Merv', content: reply });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json({ text: msg, role: 'assistant', name: 'Merv', content: msg }, { status: 500 });
  }
}
