// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ───────── Helpers ───────── */
function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => {
      const r = String(m.role || '').toLowerCase();
      const role: 'user' | 'assistant' = r === 'assistant' ? 'assistant' : 'user';
      return { role, content: m.content.trim() };
    });
}

const CONTACT_INTENT = /\b(phone|number|email|contact|employee|staff|manager|gm|general manager)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

function extractName(s: string): string | null {
  if (!s) return null;
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];
  const blacklist = new Set(['I','Phone','Number','Email','Sales','Manager','Chef','Merv','Luna','Team','Employees']);
  const candidates = Array.from(new Set(all)).map(t=>t.trim()).filter(t=>!blacklist.has(t)).sort((a,b)=>b.length-a.length);
  return candidates[0] || null;
}

function parseDateSmart(s: string): string | null {
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/); if (iso?.[1]) return iso[1];
  const us  = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) {
    const mm = +us[1], dd = +us[2]; let yy = us[3] ? +us[3] : new Date().getFullYear();
    if (yy < 100) yy += 2000;
    const dt = new Date(yy, mm-1, dd);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0,10);
  }
  return null;
}

const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357d6496';

/* ───────── Route ───────── */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ text: 'Unauthorized' }, { status: 401 });

    // Body
    const raw = await req.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch {}

    let history = sanitizeHistory(Array.isArray(parsed?.messages) ? parsed.messages : []);
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim()) {
      history = [{ role: 'user', content: parsed.message.trim() }];
    }
    if (!history.length) return NextResponse.json({ text: 'Message is required' }, { status: 400 });

    const lastUserMsg = history.slice().reverse().find(m => m.role === 'user')?.content || '';

    /* ───────── Employees: direct phone/email ───────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      try {
        const nameGuess = extractName(lastUserMsg);
        const cleaned = (nameGuess || lastUserMsg)
          .replace(/(phone|number|email|contact|employee|manager|staff|gm)\b/gi,'')
          .replace(/[^\w' ]+/g,' ')
          .trim();

        const tokens = cleaned.split(' ').filter(t => t.length > 1).slice(0,3);
        const ors: string[] = [];
        if (cleaned) ors.push(`email.ilike.%${cleaned}%`);
        tokens.forEach(t => {
          ors.push(`first_name.ilike.%${t}%`);
          ors.push(`last_name.ilike.%${t}%`);
          ors.push(`email.ilike.%${t}%`);
        });

        const { data: employees } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, phone')
          .or(ors.join(','))
          .limit(5);

        if (employees?.length) {
          const e = employees[0];
          const full = [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown';
          const txt = [full, e.email ? `Email: ${e.email}` : null, e.phone ? `Phone: ${e.phone}` : null]
            .filter(Boolean)
            .join('\n');
          return NextResponse.json({ text: txt });
        }

        const notFound = `I couldn’t find ${cleaned || 'that person'} in employees.`;
        return NextResponse.json({ text: notFound });
      } catch (e: any) {
        return NextResponse.json({ text: `Employee lookup error: ${e?.message || 'unknown'}` });
      }
    }

    /* ───────── Sales: by date ───────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      try {
        const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0,10);

        let row: any = null;
        const { data: daily } = await supabase
          .from('daily_sales')
          .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1);
        if (daily?.[0]) row = daily[0];

        if (!row) {
          const { data: legacy } = await supabase
            .from('sales_daily')
            .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
            .eq('work_date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1);
          if (legacy?.[0]) {
            const s = legacy[0];
            row = { date: s.work_date, net_sales: s.net_sales, bar_sales: s.bar_sales, total_tips: s.total_tips, comps: s.comps, voids: s.voids, deposit: s.deposit };
          }
        }

        if (row) {
          const s = row;
          const txt =
            `Sales for ${s.date}:\n` +
            `- Net Sales: $${Number(s.net_sales || 0).toFixed(2)}\n` +
            `- Bar Sales: $${Number(s.bar_sales || 0).toFixed(2)}\n` +
            (s.total_tips ? `- Total Tips: $${Number(s.total_tips).toFixed(2)}\n` : '') +
            (s.comps ? `- Comps: ${s.comps}\n` : '') +
            (s.voids ? `- Voids: ${s.voids}\n` : '') +
            (s.deposit ? `- Deposit: ${s.deposit}\n` : '');
          return NextResponse.json({ text: txt.trim() });
        }

        return NextResponse.json({ text: `No sales found for ${d}.` });
      } catch (e: any) {
        return NextResponse.json({ text: `Sales lookup error: ${e?.message || 'unknown'}` });
      }
    }

    /* ───────── Fallback: concise AI response ───────── */
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are Merv. Be concise, factual, and owner-friendly.' },
        ...history.slice(-10),
      ],
    });
    const reply = completion.choices?.[0]?.message?.content || '[No reply from model]';
console.log('[CHAT DEBUG] reply:', reply);
return NextResponse.json({ text: reply || '[empty text returned]' });
  } catch (err: any) {
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json({ text: msg }, { status: 500 });
  }
}
