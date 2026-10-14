import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };
function send(res, status, body, type='application/json; charset=utf-8') { res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); }
async function getBody(req) {
  let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 1_000_000) throw new Error('Request too large'); }
  return JSON.parse(data || '{}');
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok:true, mode: AI_API_KEY ? 'live' : 'demo', model: AI_API_KEY ? AI_MODEL : null });
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      const body = await getBody(req);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
      if (!messages.length || messages.some(m => !['user','assistant'].includes(m.role) || typeof m.content !== 'string')) return send(res, 400, { error:'Valid messages are required.' });
      if (messages.reduce((n,m) => n + m.content.length, 0) > 24000) return send(res, 413, { error:'এই কথোপকথনটি অনেক বড়। সংক্ষিপ্ত করে আবার চেষ্টা করো।' });
      if (!AI_API_KEY) {
        const latest = [...messages].reverse().find(m => m.role === 'user')?.content || '';
        return send(res, 200, { mode:'demo', reply: demoReply(latest) });
      }
      
const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${AI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: AI_MODEL,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: 'You are NEXORA AI, a helpful, clear, practical assistant for everyday work and small businesses. Respond in the user’s language. Be honest about limitations. Never claim to have completed an external action unless a connected tool actually did it. Ask before sending messages, making purchases, deleting data, or taking other consequential actions.'
      },
      ...messages
    ]
  }),
  signal: AbortSignal.timeout(45000)
});

      const data = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 502, { error: data?.error?.message || `AI provider returned status ${response.status}. Check API settings.` });
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) return send(res, 502, { error:'AI provider returned an empty response.' });
      return send(res, 200, { mode:'live', reply:reply.trim() });
    } catch (e) { return send(res, 500, { error: e.message === 'Request too large' ? 'Request too large.' : 'সার্ভারের সঙ্গে যোগাযোগ করা যায়নি। আবার চেষ্টা করো।' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error:'Method not allowed' });
  let pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const safePath = normalize(pathname).replace(/^([/\\]*\.\.[/\\])+/, '');
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) return send(res, 403, { error:'Forbidden' });
  try { const data = await readFile(filePath); res.writeHead(200, { 'Content-Type':mime[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff' }); return res.end(req.method === 'HEAD' ? undefined : data); }
  catch { return send(res, 404, { error:'Not found' }); }
});
function demoReply(text) {
  const q = text.toLowerCase();
  if (q.includes('workflow') || q.includes('অটোমেশন') || q.includes('automation')) return 'চলো একটি ছোট Workflow দিয়ে শুরু করি।\n\n১. Trigger: নতুন Lead বা Form Submission।\n২. Validate: নাম ও যোগাযোগের তথ্য আছে কি না যাচাই।\n৩. Save: অনুমোদিত Google Sheet বা Database-এ সংরক্ষণ।\n৪. Draft: AI দিয়ে ফলোআপের খসড়া তৈরি।\n৫. Review: পাঠানোর আগে ব্যবহারকারীর অনুমতি।\n\nএটি এখন Demo Mode—বাইরের অ্যাপের সঙ্গে বাস্তব সংযোগ চালু নেই। API/Workflow যুক্ত করলে এটি বাস্তবে চালানো যাবে।';
  if (q.includes('website') || q.includes('ওয়েবসাইট') || q.includes('ওয়েবসাইট')) return 'ওয়েবসাইট তৈরির জন্য এই পরিকল্পনাটি ব্যবহার করতে পারো:\n\n• লক্ষ্য ও ব্যবহারকারী নির্ধারণ\n• পেজের কাঠামো ও ডিজাইন\n• Responsive Frontend\n• প্রয়োজন হলে Backend ও Database\n• নিরাপত্তা ও মোবাইল টেস্ট\n• Hosting ও Domain-এ প্রকাশ\n\nতুমি কোন ধরনের ব্যবসার ওয়েবসাইট বানাতে চাও বললে আমি পেজভিত্তিক পরিকল্পনা সাজিয়ে দেব।';
  if (q.includes('business') || q.includes('ব্যবসা')) return 'একটি ছোট ব্যবসার জন্য শুরুতে তিনটি বিষয় কাজে লাগতে পারে:\n\n১. কাস্টমার ও Lead-এর তথ্য গুছিয়ে রাখা।\n২. দ্রুত উত্তর দেওয়ার জন্য AI-তৈরি খসড়া।\n৩. ফলোআপ ও কাজের তালিকা।\n\nপ্রথমে একটি কাজ ভালোভাবে তৈরি ও পরীক্ষা করো; পরে নতুন Integration যোগ করো।';
  return `তোমার অনুরোধ বুঝেছি: “${text}”\n\nআমি NEXORA AI-এর Demo Mode-এ আছি। এখনই কোনো বাইরের কাজ বা ডেটা পরিবর্তন করছি না।\n\nআরও নির্দিষ্টভাবে সাহায্য করতে চাইলে বলো:\n• তুমি কী ফলাফল চাও?\n• কার জন্য এটি?\n• কোনো নির্দিষ্ট টুল ব্যবহার করবে কি?\n\nবাস্তব AI উত্তর পেতে সার্ভারে নিজের AI API key যোগ করতে হবে।`;
}
server.listen(PORT, () => console.log(`NEXORA AI running at http://localhost:${PORT} (${AI_API_KEY ? 'live AI mode' : 'demo mode'})`));
