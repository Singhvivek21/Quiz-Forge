# AI QuizForge — Production-Grade AI Educational Assessment Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20(sql.js)-003b57.svg)](https://sqlite.org/)
[![Gemini API](https://img.shields.io/badge/AI-Google%20Gemini-4285f4.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

AI QuizForge is a full-featured, privacy-focused educational assessment platform powered by Google Gemini and built with React, Node.js/Express, and SQLite. It enables students to generate rigorous customized quizzes, practice adaptively against concept weaknesses, and track learning progress with deterministic gamification. It also provides educators with a dedicated Teacher Mode to author quizzes, generate privacy-safe share links, and inspect classroom item analytics.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Google Gemini API Setup](#5-google-gemini-api-setup)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup & Schema](#7-database-setup--schema)
8. [Local Development](#8-local-development)
9. [Automated Testing Suite](#9-automated-testing-suite)
10. [Production Build](#10-production-build)
11. [Deployment Instructions](#11-deployment-instructions)
12. [Known Limitations & Future Roadmap](#12-known-limitations--future-roadmap)

---

## 1. Project Overview

AI QuizForge bridges the gap between generative AI capabilities and strict pedagogical assessment requirements. Many AI flashcard or quiz tools simply output arbitrary questions with unverified keys. AI QuizForge enforces:

- **Strict Schema Enforcement**: Schema-constrained JSON generation guaranteed via multi-layer validators.
- **Deterministic Evaluation**: Answers are scored at the application layer with zero reliance on LLMs during quiz taking.
- **Adaptive Remediation**: Response histories are mined to isolate specific weak concepts and generate follow-up practice sessions excluding previous questions.
- **Zero PII Exposure**: Student names and private information are never transmitted or leaked to teachers; quizzes are shared via anonymous cryptographically secure tokens.

---

## 2. Key Features

### Student Experience
- **Interactive Quiz Generator**:
  - Topics, subjects, and source material parsing (`.txt`, `.pdf`, `.docx`).
  - 5 question types: Multiple Choice (MCQ), True/False, Scenario-Based, Case-Based MCQ, and Numerical/Calculation.
  - Difficulty selection: Easy, Medium, Hard, and Mixed.
  - Configurable countdown timers, instant step hints, and detailed explanations.
- **Full Quiz Player**:
  - Keyboard navigation (stepper, question jumps, arrow keys, numeric hotkeys).
  - State retention across back/forward question transitions.
  - Confirmation modals before early submission.
  - Auto-submission upon timer expiry.
- **In-Depth Results & AI Analysis**:
  - Performance percentage, speed metrics, and question review drawer.
  - Concept-level mastery breakdown with accuracy ratings.
  - One-click trigger for targeted Adaptive Practice sessions.
- **Deterministic Gamification**:
  - Real XP earned strictly through verified correct answers (+10 XP per correct MCQ, +5 XP per True/False, +15 XP per Scenario/Calculation, +25 XP streak bonus).
  - Progressive level scaling ($XP = 100 \times \text{level}^{1.5}$).
  - Calendar-aware daily study streak counter.
  - 10 milestone badges (First Quiz, Perfect Score, 10 Quizzes, 100 Questions, 7-Day Streak, Adaptive Learner, etc.).
- **Comprehensive History & Dashboard**:
  - Full attempt history saved in SQLite.
  - Question-by-question historical review modal.
  - Weak concept tracking and performance trend sparklines.

### Teacher Mode & Classroom Portal
- **Educator Dashboard**:
  - Class-wide attempt volume, average score, pass rates, and completion metrics.
  - Weak concept aggregation across all student submissions.
  - Difficulty distribution performance.
- **Quiz Editor & Management**:
  - Full CRUD for quizzes, individual questions, options, hints, and explanations.
  - Add, reorder, delete, and modify questions before distribution.
- **Item Discrimination & Analytics**:
  - Per-question success rate breakdown.
  - Most common student mistakes and distractor analysis.
- **Privacy-Safe Quiz Sharing**:
  - Generates unique 8-character alphanumeric share codes (e.g., `/share/A3F9K2X1`).
  - Allows students to take assignments without accounts or PII transmission.

---

## 3. Technology Stack

### Frontend (`client/`)
- **Core**: React 18 (`react`, `react-dom`), React Router DOM v6
- **Styling**: TailwindCSS v3, PostCSS, Autoprefixer
- **Icons**: Lucide React
- **Build Tool**: Vite 5
- **End-to-End Testing**: Playwright

### Backend (`server/`)
- **Runtime**: Node.js 18+ (CommonJS)
- **Framework**: Express 4
- **Security**: Helmet, CORS, Express Rate Limit
- **Database Engine**: `sql.js` (SQLite compiled to WebAssembly with file persistence)
- **File Parsing**: `multer`, `pdf-parse`, `mammoth`
- **AI SDK**: `@google/generative-ai` (Google Gemini SDK)
- **Logging**: Morgan

---

## 4. System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Client (React 18 + Vite)                │
│                                                             │
│  [Pages]                                                    │
│  Home ──► CreateQuiz ──► TakeQuiz ──► Results ──► Dashboard │
│               ▲                                             │
│               │ (Adaptive Loop)                             │
│               └───────────── Weak Concepts Remediation      │
│                                                             │
│  [Teacher Pages]                                            │
│  TeacherDashboard ──► TeacherQuizzes ──► QuizEditor/Analytics│
│                                                             │
│  [Shared Route]                                             │
│  /share/:code (Anonymous Student Attempt)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP /api/v1/*
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Server (Node.js / Express)                  │
│                                                             │
│  Middleware: Helmet, CORS, RateLimiter, Role Guard          │
│                                                             │
│  [Routes / Controllers]                                     │
│  ├── /api/v1/gemini   ──► Document Parsing & Prompt Pipeline│
│  ├── /api/v1/quizzes  ──► Quiz CRUD & Sharing System        │
│  ├── /api/v1/attempts ──► Deterministic Attempt Scoring     │
│  ├── /api/v1/progress ──► Weak Concepts & Gamification      │
│  └── /api/v1/teacher  ──► Teacher RBAC & Aggregated Metrics │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│        Google Gemini API     │ │     SQLite Database         │
│                              │ │                             │
│ • Primary: gemini-3.8-flash  │ │ • quizzes                   │
│ • Fallback 1: 3.7-flash      │ │ • questions & options       │
│ • Fallback 2: 3.5-flash      │ │ • attempts & attempt_answers│
│ • Fallback 3: 3.1-flash-lite │ │ • user_progress & concepts  │
│ • Fallback 4: flash-latest   │ │ • gamification_profiles     │
└──────────────────────────────┘ └─────────────────────────────┘
```

---

## 5. Google Gemini API Setup

1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Never put your API key in client-side code. All calls are proxied through the Express server.
3. Add the key to `server/.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
4. Verify configuration using the health endpoint:
   ```bash
   curl http://localhost:3001/api/v1/gemini/status
   ```
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "configured": true,
       "model": "gemini-3.8-flash"
     }
   }
   ```

### Multi-Model Fallback Hierarchy
To guarantee high availability and prevent downtime from model deprecation or temporary quotas, the Gemini service uses an automatic fallback cascade:
1. `gemini-3.8-flash` (Primary default)
2. `gemini-3.7-flash` (Fallback 1)
3. `gemini-3.5-flash` (Fallback 2)
4. `gemini-3.1-flash-lite` (Fallback 3)
5. `gemini-flash-latest` (Fallback 4)

---

## 6. Environment Variables

Create a `server/.env` file based on `.env.example`:

| Variable | Description | Default | Required in Production |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend HTTP listening port | `3001` | No |
| `NODE_ENV` | Environment mode (`development` / `production` / `test`) | `development` | Yes (`production`) |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | *None* | **Yes** |
| `DATABASE_PATH` | Path to persistent SQLite database file | `./data/quizforge.sqlite` | No |
| `CLIENT_ORIGIN` | Allowed CORS origin URL for client requests | `http://localhost:5173` | **Yes** |

---

## 7. Database Setup & Schema

AI QuizForge uses a self-initializing SQLite database (`sql.js` engine). Tables, foreign keys, and indexes are automatically verified and created on server startup.

### Relational Schema
- `quizzes`: Stores title, subject, topic, difficulty, timer settings, share codes, and teacher IDs.
- `questions`: Stores question text, type, order, correct answer ID, explanation, hint, and target concept.
- `options`: Stores individual option labels (`A`, `B`, `C`, `D`) and text.
- `attempts`: Stores quiz attempts, timestamps, scores, percentage, time spent, and student tokens.
- `attempt_answers`: Stores per-question user responses, correctness booleans, and concept tags.
- `user_progress`: Aggregates concept-level mastery scores, correct counts, and attempt volume.
- `gamification_profiles`: Stores deterministic XP, level indices, streak counters, and awarded badge IDs.

---

## 8. Local Development

### Prerequisites
- Node.js `18.x` or `20.x`
- npm `9.x` or `10.x`

### 1. Setup Backend
```bash
cd server
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY
npm install
npm run dev
```
The server will start at `http://localhost:3001`.

### 2. Setup Frontend
In a separate terminal:
```bash
cd client
npm install
npm run dev
```
The client will start at `http://localhost:5173`. Vite proxies `/api/v1/*` requests directly to `http://localhost:3001`.

---

## 9. Automated Testing Suite

The project includes an extensive multi-tier test suite covering backend logic, mock Gemini responses, file upload defenses, and end-to-end browser flows.

### Running Backend Tests
From the `server/` directory:
```bash
# Run all offline unit, integration, and security tests (84 QA tests + 5 offline + 5 upload)
npm test
```

#### Individual Test Scripts
- `npm run test:offline` — Complete offline suite (requires no API key or internet).
- `npm run test:upload` — File upload defense verification (type, size, and header validation).
- `npm run test:live` — Opt-in live Gemini test (uses configured `GEMINI_API_KEY` to test live generation).

### Running Frontend Tests
From the `client/` directory:
```bash
# Run Playwright browser UI tests (Chromium & Mobile Chrome)
npm run test:ui
```

---

## 10. Production Build

### Building the Frontend
```bash
cd client
npm run build
```
This outputs optimised production assets to `client/dist/`.

### Verifying the Production Build
```bash
cd client
npm run preview
```

---

## 11. Deployment Instructions

### Architecture Options

#### Option A: Unified Full-Stack Node.js Deployment (Recommended for VPS / Docker / Render)
When `NODE_ENV=production` is set, Express automatically detects and serves static files from `client/dist/` if present.
1. Build the frontend:
   ```bash
   cd client && npm install && npm run build
   ```
2. Prepare the server:
   ```bash
   cd ../server && npm install --production
   ```
3. Set environment variables:
   ```env
   NODE_ENV=production
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the server:
   ```bash
   node index.js
   ```
   Both the frontend UI and the REST API are served on port `3000`.

#### Option B: Decoupled Deployment (e.g. Vercel for Frontend + Node on Render/Railway)
1. **Frontend**: Deploy `client/` to Vercel/Netlify. Set the build command to `npm run build` and output directory to `dist`. Configure rewrite rules to route `/api/*` to your backend URL.
2. **Backend**: Deploy `server/` to Render, Railway, or Fly.io.
3. Configure `CLIENT_ORIGIN` on the backend to match your frontend production domain (e.g., `https://quizforge.example.com`).

---

## 12. Known Limitations & Future Roadmap

### Current Limitations
- **Multi-Tenant Authentication**: Role selection currently relies on role switching headers for demonstration purposes. True enterprise production requires JWT/OAuth2 integration (e.g., Auth0, Firebase Auth, or Supabase).
- **In-Memory SQLite Serialization**: Uses `sql.js` with filesystem syncing. For high-concurrency multi-instance clusters, migrate to PostgreSQL or serverless LibSQL/Turso.
- **Document Text Extraction**: Large PDFs with scanned non-OCR images are limited to text layers extractable by `pdf-parse`.

### Future Roadmap
- **SSO Integration**: Google Classroom & Canvas LTI 1.3 deep linking.
- **Multimedia Questions**: Support for AI-generated diagrams and LaTeX math equations rendering via KaTeX.
- **Multiplayer Live Quiz Sessions**: Socket.IO powered real-time classroom buzzer quizzes.
- **Voice Mode**: Speech-to-text question recitation for auditory learners and accessibility compliance.
