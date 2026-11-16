# Fork & Flame — AI Customer Support Chatbot & Admin Suite

An end-to-end, anti-hallucination **AI Customer Support Chatbot** and **Operations Admin Dashboard** built for **Fork & Flame** (a fictional wood-fired bistro in downtown Austin). The platform combines an **ASP.NET Core 8 Web API** powered by **OpenAI (`gpt-4o-mini`)**, **Entity Framework Core**, and **SQLite** with a **React + TypeScript + Vite + Tailwind CSS** storefront, floating chat widget, and staff management console.

---

## Overview & Grounded AI Architecture

Customer-facing AI assistants in hospitality must never invent menu prices, allergens, opening hours, or delivery boundaries. Fork & Flame enforces factual accuracy through a four-stage **Retrieval-Augmented Generation (RAG) & Guardrail Pipeline**:

1. **Top-K Knowledge Retrieval (`IKnowledgeRetrievalService`):**
   - Queries active Knowledge Base (`KnowledgeEntry`) records (`IsActive = true`) on every incoming message.
   - Applies English stopword filtering, compound-term splitting (e.g., `gluten-free`), lightweight stemming, and weighted scoring across `Title`, `Category`, and `Content` to retrieve up to the top **5** relevant articles.
2. **Zero-Match Short-Circuit:**
   - If no active Knowledge Base entry clears the relevance threshold (e.g., asking for a *"private chef tasting menu"* when none exists), the API **short-circuits before calling OpenAI** and returns an honest fallback response offering human handoff (`offerHandoff: true`, `sources: []`, `tokensUsed: 0`).
3. **Strict Anti-Hallucination Prompt & Structured JSON Output (`IOpenAiChatService`):**
   - When relevant entries are found, the system prompt binds `gpt-4o-mini` (`temperature: 0.2`, `max_tokens: 300`, `response_format: json_object`) strictly to the retrieved `KNOWLEDGE BASE CONTEXT` plus the last 6 conversation turns for continuity.
   - The model outputs `{ reply, usedSourceTitles, needsHumanHandoff }`.
4. **Server-Side Source Verification & Human Handoff:**
   - Every title in `usedSourceTitles` is verified server-side against the exact Knowledge Base entries retrieved for that request—any unverified or hallucinated citation is stripped before persisting or returning to the client.
   - When `offerHandoff` is triggered (or anytime a guest clicks **Talk to a Human**), `POST /api/chat/{sessionId}/escalate` creates a persistent `SupportTicket` (`Open`) linked to the full conversation transcript and appends an assistant confirmation message with the ticket ID.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend API** | ASP.NET Core Web API (.NET 8), C#, Swagger / OpenAPI |
| **ORM & Database** | Entity Framework Core 8 + SQLite (`forkandflame_support.db`) |
| **AI Integration** | OpenAI Chat Completions API (`gpt-4o-mini`) via typed `HttpClient` |
| **Frontend** | React 18, TypeScript, Vite, React Router DOM, Tailwind CSS, Lucide Icons |

---

## Repository Structure

```text
/
├── .gitignore
├── README.md
├── docs/                 # Placeholder directory for application screenshots
└── src/
    ├── Api/              # ASP.NET Core 8 Web API + EF Core + SQLite + OpenAI
    │   ├── Controllers/  # Chat, Knowledge, Tickets, Conversations, Health
    │   ├── Data/         # SupportDbContext & 15-entry Fork & Flame seeder
    │   ├── DTOs/         # Request & response contracts
    │   ├── Models/       # KnowledgeEntry, Conversation, ChatMessage, SupportTicket
    │   └── Services/     # Retrieval engine, OpenAI service, DTO mappers
    └── Web/              # React + TypeScript + Vite + Tailwind CSS
        └── src/
            ├── api/      # Centralized API client (VITE_API_URL)
            ├── components/ # Navbar, Floating ChatWidget, TranscriptView, StatePanel
            ├── pages/    # Storefront Demo, KB Editor, Support Tickets, Conversations
            ├── types/    # Shared TypeScript interfaces
            └── utils/    # Session storage, date formatting, cost estimator
```

---

## Prerequisites & Local Setup

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) and `npm`
- An OpenAI API key (`sk-...`)

### 1. Run the Backend (`/src/Api`)

```bash
cd src/Api
dotnet restore
dotnet run
```

- The API starts on **`http://localhost:5000`** with Swagger UI available at **`http://localhost:5000/swagger`**.
- On first startup, `DatabaseSeeder` automatically creates `forkandflame_support.db` and seeds **15 Fork & Flame Knowledge Base entries** covering hours, downtown Austin location, wood-fired mains & pricing, delivery zones/fees, gluten-free & nut-free protocols, reservations, catering, parking, and gift cards.

### 2. Run the Frontend (`/src/Web`)

Open a second terminal:

```bash
cd src/Web
cp .env.example .env
npm install
npm run dev
```

- The React application runs on **`http://localhost:5173`** and points to `VITE_API_URL=http://localhost:5000` by default.
- Navigate across:
  - **`/`** — Fork & Flame restaurant landing page with interactive sample prompt chips and the embeddable bottom-right **Chat Widget** (`localStorage` session persistence).
  - **`/admin/knowledge`** — Searchable Knowledge Base CRUD editor (create, edit, activate/deactivate, delete).
  - **`/admin/tickets`** — Support Ticket queue with status workflow (`Open` → `In Progress` → `Resolved`) and full transcript drawer.
  - **`/admin/conversations`** — Master-detail conversation audit log with verified source citations and per-turn token counts.

---

## Configuring the OpenAI API Key

> **Security Note:** Never commit API keys or secrets to Git. `.gitignore` excludes `.env`, `secrets.json`, `appsettings.Development.local.json`, and SQLite `*.db` files.

Choose either of the following secure methods before sending chat messages:

### Option A: .NET User Secrets (Recommended for Local Development)

```bash
cd src/Api
dotnet user-secrets set "OpenAI:ApiKey" "sk-your-openai-api-key"
```

### Option B: Environment Variable

**PowerShell (Windows):**
```powershell
$env:OPENAI_API_KEY="sk-your-openai-api-key"
dotnet run --project src/Api
```

**Bash (macOS / Linux):**
```bash
export OPENAI_API_KEY="sk-your-openai-api-key"
dotnet run --project src/Api
```

### Graceful Missing-Key Behavior

If no OpenAI API key is configured at startup, the backend **still boots normally** so you can explore the Storefront, Knowledge Base Editor, Tickets, and Health endpoints:
- `GET /api/health` reports `"openAiConfigured": false`.
- `POST /api/chat` returns a descriptive `503 Service Unavailable` JSON payload (`OPENAI_API_KEY_MISSING`) explaining how to set `OPENAI_API_KEY` or `dotnet user-secrets`, and the chat widget renders a clean error banner with a **Retry** button.

---

## Token Usage & Cost Awareness

To keep production support costs predictable on high-traffic hospitality sites:

- **Model:** `gpt-4o-mini` (`$0.15 / 1M` input tokens, `$0.60 / 1M` output tokens).
- **Output Cap:** `OpenAI:MaxTokens` defaults to **`300`**, and `OpenAI:Temperature` defaults to **`0.2`** for concise, deterministic responses.
- **Selective Context Injection:** Only the top **5** relevant KB entries (plus up to the last **6** conversation turns) are included in the prompt instead of dumping the entire database.
- **Zero-Match Short-Circuit:** Unanswerable out-of-scope questions consume **0 OpenAI tokens**.
- **Per-Message Telemetry:** Every assistant reply records `TokensUsed` (`total_tokens` from OpenAI `usage`) in SQLite, visible per message and per session in `/admin/conversations`.
- **Estimated Cost:** A typical 2–4 turn customer support conversation uses roughly **1,200–2,500 total tokens**, costing approximately **\$0.0003–\$0.0008 per conversation**.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | Processes a user message, runs KB retrieval, calls `gpt-4o-mini` with grounding, validates citations, persists turns, and returns `{ reply, sources, offerHandoff, tokensUsed, createdAt }`. |
| `GET` | `/api/chat/{sessionId}` | Returns conversation metadata, full ordered message history with sources, and any active `SupportTicket`. |
| `POST` | `/api/chat/{sessionId}/escalate` | Creates an `Open` `SupportTicket` for the session and appends a confirmation assistant message (`201 Created`). |
| `GET` | `/api/knowledge` | Lists Knowledge Base entries ordered by `Category` and `Title` (supports `?search=` and `?category=`). |
| `POST` | `/api/knowledge` | Creates a new `KnowledgeEntry` (`201 Created`), immediately available to subsequent chat turns. |
| `PUT` | `/api/knowledge/{id}` | Updates `Title`, `Content`, `Category`, `IsActive`, and refreshes `UpdatedAt`. |
| `DELETE` | `/api/knowledge/{id}` | Deletes a `KnowledgeEntry` (`204 No Content`). |
| `GET` | `/api/tickets` | Lists `SupportTicket` records ordered by `CreatedAt` descending (supports `?status=Open\|InProgress\|Resolved`). |
| `PATCH` | `/api/tickets/{id}` | Updates ticket status (`Open`, `InProgress`, or `Resolved`). |
| `GET` | `/api/conversations` | Lists all conversations ordered by latest activity, including message count, total tokens, ticket badge, and full transcript. |
| `GET` | `/api/health` | Health check returning `{ status, service, openAiConfigured, timestamp }`. |

---

## Screenshots

Application screenshots and walkthrough captures live in [`/docs`](./docs).

- **Storefront & Floating Chat Widget** — `docs/storefront-chat-widget.png` *(add capture)*
- **Knowledge Base CRUD Editor** — `docs/admin-knowledge-base.png` *(add capture)*
- **Support Tickets & Transcript Drawer** — `docs/admin-support-tickets.png` *(add capture)*
- **Conversation Logs & Token Tracking** — `docs/admin-conversations.png` *(add capture)*
