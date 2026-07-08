# 🛡️ SafeAI Assistant

**Browser extension + backend that stops PII and sensitive data from leaking into ChatGPT, Claude, Gemini, Grok, DeepSeek, and Perplexity — before you hit send.**

![Manifest V3](https://img.shields.io/badge/manifest-v3-blue?style=flat-square)
![Node.js](https://img.shields.io/badge/backend-Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-active--development-orange?style=flat-square)

SafeAI Assistant is a SaaS security layer for SMBs that use public AI chat tools. It detects PII/sensitive data in prompts and documents in real time, anonymizes it, enforces tenant-level policy, and gives owners a dashboard + compliance report — all before data ever leaves the browser.

---

## 📸 Screenshots

<img width="822" height="594" alt="image" src="https://github.com/user-attachments/assets/870492ca-5cb3-442c-a562-fb3096174832" />
<img width="508" height="157" alt="image" src="https://github.com/user-attachments/assets/eaa0d331-6ec8-42ba-b21f-b4fced0673ce" />
<img width="365" height="567" alt="image" src="https://github.com/user-attachments/assets/34b3bf8a-ec1f-4082-8382-e08d01f8cf44" />
<img width="344" height="877" alt="image" src="https://github.com/user-attachments/assets/0d503e75-f6cf-4482-b0a4-64a8dc2e6505" />
<img width="1503" height="945" alt="image" src="https://github.com/user-attachments/assets/c9bd6a2b-6de7-4c73-b4f4-437cc33c9924" />
<img width="1462" height="881" alt="image" src="https://github.com/user-attachments/assets/917a3aa6-a7f4-49f2-bc35-2abea2a05913" />

## 📸 Admin Panel
<img width="1492" height="776" alt="image" src="https://github.com/user-attachments/assets/07b57cda-fe18-4af8-a39b-bc766f2b7006" />
<img width="1435" height="862" alt="image" src="https://github.com/user-attachments/assets/83c581f1-e921-4725-a638-245a1f4623bc" />


---

## ✨ Features

- **Real-time PII detection** — names, emails, phone numbers, IDs, and bulk/tabular data flagged before sending
- **Prompt risk warnings** — inline LOW/MEDIUM/HIGH risk alerts placed next to the chat box, not a disruptive popup
- **One-click anonymization** — auto-masks sensitive text while preserving prompt intent
- **Document Wizard** — upload a file, ask questions, get answers with sensitive content stripped/anonymized first
- **Policy engine** — tenant-level rules to block, warn, or allow based on configurable policy
- **Owner dashboard** — scanned requests, blocked prompts, processed documents, usage charts
- **Monthly reporting** — exportable reports for clients/auditors
- **Compliance badge** — verifiable badge tenants can display to show they use SafeAI
- **Multi-platform support** — ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity
- **Multi-tenant SaaS** — role-based access, tenant isolation, subscription tiers/billing
- **Multilingual** — English and Hebrew (i18n-ready for more)
- **Platform admin panel** — global stats and tenant management across all customers

---

## 🏗️ Architecture

```mermaid
flowchart LR
    A[Browser Extension<br/>content.js + detectors.js] -->|prompt/text| B[Backend API<br/>Node.js + Express]
    B --> C[Detection Module<br/>PII regex + heuristics]
    B --> D[Policy Engine<br/>block / warn / allow]
    B --> E[Anonymizer<br/>text masking]
    B --> F[(PostgreSQL<br/>Tenants, Users, Logs)]
    A --> G[Side Panel UI<br/>risk alerts]
    H[Document Wizard] --> B
    I[Owner Dashboard] --> B
    J[Platform Admin] --> B
```

**Request flow:** extension captures the prompt → sends to `/security/analyze` → policy engine decides → risky content is anonymized or blocked → result shown inline in the side panel.

---

## 📁 Project Structure

```
safeai-assistant/
├── extension/          # Chrome/Edge Manifest V3 extension (content scripts, side panel, popup)
├── backend/            # Node.js/Express API — detection, anonymization, policy, auth, billing
│   ├── modules/         # Analyzer, anonymizer, policy engine, prompt enhancer, encryption
│   ├── routes/          # auth, billing, dashboard, documents, personas, platform, prompts
│   ├── models/          # Document, Policy, SecurityLog, Tenant, User
│   └── services/        # Auth, Badge, Enhancement, LLM client, Telemetry, Wizard
├── admin-dashboard/     # Tenant-facing dashboard (reports, stats, policy toggles)
├── platform-admin/      # Cross-tenant admin panel
├── document-wizard/     # Safe document upload + Q&A workflow UI
└── docs/                # Deployment guides & screenshots
```

---

## 🚀 Getting Started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in your own API keys — never commit real keys
npm start
```

### 2. Load the Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

### 3. Configure

Open the extension side panel → **Settings** → enter your backend URL and account/API key.

---

## 🔌 Key API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /security/analyze` | Analyze text/prompt for sensitive data |
| `POST /security/anonymize` | Anonymize text based on findings |
| `POST /security/decide` | Apply policy decision (block/warn/allow) |
| `POST /api/documents/upload` | Upload document to the wizard |
| `GET /dashboard/stats` | Owner dashboard metrics |
| `GET /platform/global-stats` | Cross-tenant platform stats |
| `GET /health` | Health check |

---

## 🛠️ Tech Stack

- **Extension:** Manifest V3, vanilla JS, Vite build
- **Backend:** Node.js, Express, PostgreSQL
- **Deployment:** Railway / Render / Vercel / Docker (guides in `docs/`)

---
## 📸 Results
<img width="540" height="281" alt="image" src="https://github.com/user-attachments/assets/4d14c6c5-f237-40a3-b9be-85b979b3ec5c" />
<img width="576" height="104" alt="image" src="https://github.com/user-attachments/assets/7f39ab3c-1cac-4f24-9181-5b99a5170068" />
<img width="731" height="279" alt="image" src="https://github.com/user-attachments/assets/1ce9207e-c172-4878-8bd5-582c2162019c" />


## ⚠️ Security Note

This repo ships an `.env.example`, not real credentials. Generate your own API keys for Gemini/OpenAI/Anthropic and your own `DATABASE_URL` — never commit a populated `.env` file.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
