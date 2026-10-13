# NEXORA AI — শুরু করার নির্দেশিকা (বাংলা)

এটি একটি responsive AI workspace starter। এতে সুন্দর Dashboard UI, Chat interface, Automation template preview, Projects, local conversation history এবং Node.js backend রয়েছে। API key না দিলে এটি Demo Mode-এ নমুনা উত্তর দেখায়। API key দিলে OpenAI-compatible Chat Completions API-তে অনুরোধ পাঠাতে পারে।

## ১. কী কী কাজ করছে?
- Responsive dark UI (desktop ও mobile)
- AI chat UI এবং prompt cards
- Node.js backend endpoint (`/api/chat`)
- API key server-side environment variable থেকে পড়া হয়
- API key না থাকলে Demo Mode
- History ও Projects এই browser-এ localStorage-এ রাখা হয়
- Automation templates কেবল preview; live workflow নয়

## ২. কী এখনো যুক্ত হয়নি?
- Cloud database ও real user authentication
- n8n-এর live workflow connection
- Google Sheets / Email / Calendar OAuth integration
- Subscription, payment, file uploads, team accounts
- Production-grade rate limiting, monitoring, automated tests

এগুলো পরের ধাপে যোগ করতে হবে। এই starter-কে production-ready SaaS ধরে নেওয়া যাবে না।

## ৩. Windows ল্যাপটপে চালানোর নিয়ম
1. Node.js-এর LTS সংস্করণ ইনস্টল করো: https://nodejs.org/
2. ZIP extract করে `nexora-ai` ফোল্ডার খোলো।
3. ফোল্ডারের ভেতরে File Explorer-এর address bar-এ `cmd` লিখে Enter চাপো। অথবা VS Code → Terminal → New Terminal খোলো।
4. চালাও:

   ```bash
   npm start
   ```

5. ব্রাউজারে খোলো: http://localhost:3000

এই প্রজেক্টে বাহ্যিক npm package লাগে না; Node.js 18 বা তার পরের সংস্করণ প্রয়োজন।

## ৪. Live AI চালু করা
1. প্রজেক্ট ফোল্ডারে `.env.example`-এর কপি বানিয়ে নাম দাও `.env`।
2. `.env` ফাইলে `AI_API_KEY=`-এর পরে তোমার নিজের provider key বসাও।
3. `AI_BASE_URL` ও `AI_MODEL` provider-এর নির্দেশনা অনুযায়ী সেট করো।
4. গুরুত্বপূর্ণ: বর্তমান server.js Node.js-এর built-in environment variables পড়ে। `.env` ফাইল নিজে থেকে load করে না। তাই `.env` থেকে key নেওয়ার বদলে terminal-এ environment variable সেট করতে হবে, অথবা পরের ধাপে নিরাপদ env loader যোগ করতে হবে।

PowerShell-এর বর্তমান terminal session-এর জন্য উদাহরণ:

```powershell
$env:AI_API_KEY="YOUR_REAL_KEY"
$env:AI_MODEL="gpt-4o-mini"
npm start
```

সঠিক model ও endpoint তোমার provider-এর dashboard/documentation থেকে যাচাই করো। API key কখনো `public` ফোল্ডারে বা GitHub-এ commit করবে না।

## ৫. পরীক্ষা
- `http://localhost:3000/api/health` খুলে `mode` দেখো।
- Demo Mode-এ চ্যাটে মেসেজ পাঠাও।
- Live mode-এ provider key ও model সঠিক হলে AI উত্তর আসবে।
- Automation-এর পাশে Template লেখা আছে: এগুলো বাস্তব external action চালায় না।

## ৬. পরের উন্নয়ন ধাপ
1. Supabase project ও database schema
2. Supabase Auth ও Row Level Security
3. User-specific cloud chat history
4. n8n webhook integration ও approval step
5. Rate limiting, usage tracking, logging ও tests
6. Deploy, domain, HTTPS, privacy policy ও production checks
