# Rosa.ai

**Bilingual voice + photo AI agronomist for US Hispanic smallholder farmers.**

Built for Desert Dev Lab 2026. A farmer speaks Mexican Spanish, uploads a photo
of a diseased plant, and Rosa responds in Spanish with a diagnosis and a
cited NMSU Extension guide — in under 90 seconds, in a browser, no app install.

---

## Why

- **84,000** US Hispanic-operated farms produce **$33B** in annual sales
- Cooperative Extension publications are **English-first and text-heavy**
- No deployed AI advisor handles **Mexican Spanish voice + photo diagnosis + real Extension citations**

Rosa is the first.

---

## What's inside

- **Real-time voice** — OpenAI Realtime API over WebRTC, browser mic, ephemeral tokens
- **Photo diagnosis** — GPT-4o vision (or Claude Opus) grounded in the NMSU corpus
- **100+ NMSU publications** — indexed in an OpenAI vector store (chile, vegetables, fruit, pecan, soil, irrigation, pests, marketing)
- **Weather-aware** — live `api.weather.gov` forecast feeds into irrigation advice
- **Web fallback** — OpenAI Responses API `web_search_preview` when NMSU doesn't cover the topic
- **Bilingual** — Spanish / English, language-isolated session memory (Spanish sessions never surface English context and vice versa)
- **Full voice UX** — StateOrb with 6 phase visuals, live mic amplitude meter, mute, chat-on-tap, photo-interrupt
- **History drawer** — past sessions grouped by date, expandable, per-language

---

## Architecture

```
Browser (Next.js 15, React 19)
├── WebRTC ─────────▶ OpenAI Realtime (gpt-realtime voice)
│                      via ephemeral token from /api/realtime/session
│                      (injects rosa-prompt + tools + cached NOAA forecast)
│
├── /api/diagnose-photo ─────▶ OpenAI gpt-4o vision (or Anthropic Opus)
├── tool: search_nmsu ────────▶ /api/search-nmsu ─▶ OpenAI vector_stores.search
├── tool: cite_nmsu_doc ──────▶ client-side citation store (UI card)
├── tool: web_search_fallback ▶ /api/web-search ──▶ OpenAI Responses API
├── /api/admin/reindex ──────▶ rebuilds vector store from seeds/
│
└── localStorage: rosa-history (last 50 sessions, per-language context)
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15/16 (Turbopack) · React 19 · App Router |
| Language | TypeScript, strict |
| Styling | Tailwind v4 · shadcn primitives |
| State | Zustand (+ persist for history) |
| Motion | Framer Motion |
| Voice | OpenAI Realtime API · WebRTC · model `gpt-realtime` · voice `marin` |
| Vision | OpenAI `gpt-4o` (primary) · Anthropic `claude-opus-4-7` (fallback) |
| RAG | OpenAI Vector Stores |
| Weather | api.weather.gov (free, no key) |
| Deploy | Vercel |

---

## Local development

```bash
git clone https://github.com/VAMSINADH2000/Rosa.git
cd Rosa
npm install
cp .env.example .env.local   # then fill in API keys
npm run dev                  # http://localhost:3000
```

First time only: build the vector-store index with 100+ NMSU docs.

```bash
curl -X POST http://localhost:3000/api/admin/reindex \
  -H "Content-Type: application/json" \
  -d '{"confirm":"YES"}'
```

Copy the `store_id` from the response into `OPENAI_VECTOR_STORE_ID` in
`.env.local` to skip the lookup-by-name step on future restarts.

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Minimum required:

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | **yes** | Voice, vision, vector store, web search |
| `OPENAI_REALTIME_MODEL` | **yes** | Set to `gpt-realtime` |
| `OPENAI_VECTOR_STORE_ID` | recommended | Pin after first reindex so cold-starts are fast |
| `ANTHROPIC_API_KEY` | only if `DIAGNOSE_PROVIDER=anthropic` | Alternate photo path |
| `DIAGNOSE_PROVIDER` | no (defaults `openai`) | `openai` or `anthropic` |

---

## Project layout

```
app/
├── layout.tsx, page.tsx, icon.tsx, globals.css
└── api/
    ├── realtime/session/     — mint OpenAI Realtime ephemeral key
    ├── diagnose-photo/       — vision diagnosis
    ├── search-nmsu/          — RAG search
    ├── web-search/           — web fallback
    └── admin/reindex/        — rebuild vector store

components/
├── hero.tsx, landing-sections.tsx, top-bar.tsx
├── voice-panel.tsx           — WebRTC lifecycle + tool dispatch + phase tracking
├── conversation-view.tsx     — full-screen conversation surface
├── state-orb.tsx             — Rosa portrait + phase-specific ring animations
├── mic-amplitude.tsx         — Web Audio AnalyserNode 9-bar meter
├── status-strip.tsx          — phase label at the top
├── transcript.tsx            — turns + inline citation cards
├── citation-panel.tsx        — right-rail citations (desktop)
└── history-drawer.tsx        — past sessions

lib/
├── rosa-prompt.ts            — instruction builder
├── realtime-tools.ts         — tool specs (search_nmsu, cite_nmsu_doc, web_search_fallback)
├── nmsu-kb.ts                — vector store create / upload / search
├── weather.ts                — api.weather.gov client
├── i18n.ts                   — EN/ES string table
└── *-store.ts                — Zustand stores (transcript, citation, history, phase, lang, user-profile)

seeds/
├── nmsu-docs.ts              — doc metadata (auto-generated)
└── nmsu-content.json         — doc body text

scripts/
├── generate-seeds.mjs        — merge scraped batches → seeds
└── generate-slides.py        — render the pitch deck .pptx
```

---

## Deployment

1. Push to GitHub.
2. **vercel.com → Import Git Repository** → pick the repo → framework auto-detects Next.js
3. **Settings → Environment Variables** → paste each from `.env.example`
4. Deploy. Rosa runs on the assigned `*.vercel.app` URL.

Cold-start note: if `OPENAI_VECTOR_STORE_ID` isn't set, the first
`search_nmsu` call will try to upload 100+ docs and may exceed hobby-tier
timeouts. Set the env var after running `/api/admin/reindex` once.

---

## Acknowledgments

- **NMSU Extension** for publicly-available research at
  [pubs.nmsu.edu](https://pubs.nmsu.edu)
- **NOAA** for `api.weather.gov`
- **OpenAI** for Realtime, Responses, and vector store APIs
- Desert Dev Lab 2026 for the runway

Rosa is not a replacement for your local county Extension agent.
