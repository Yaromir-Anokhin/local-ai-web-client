# 🤖 Local AI Web Client (Dockerized)

A lightweight, modern web interface for interacting with local Large Language Models (LLMs) via [Ollama](https://ollama.com/), fully containerized with Docker and Docker Compose.

Features real-time token streaming (Server-Sent Events), Markdown & syntax-highlighted code rendering, automatic model discovery, generation cancellation, and 100% private execution without sending data to external cloud APIs.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Modern Dark CSS with Glassmorphism, `react-markdown`, `remark-gfm`, `lucide-react`.
- **Backend**: Node.js, Express, `cors`, native fetch streaming reader (SSE reverse proxy).
- **Containerization**: Multi-stage Dockerfile (Vite build -> Nginx production server), Docker Compose with `extra_hosts` for host Ollama connectivity (`http://host.docker.internal:11434`).
- **LLM Engine**: Ollama (or any compatible endpoint listening on port 11434).

---

## 🏛 Architecture

```text
├── backend/
│   ├── src/
│   │   └── index.js        # Express server, proxy logic, and SSE streaming pipeline
│   ├── Dockerfile          # Lightweight Node.js 20 Alpine container
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Chat interface, streaming listener, Markdown renderer
│   │   ├── main.tsx
│   │   └── index.css       # Themes, custom scrollbars, typography, markdown styles
│   ├── nginx.conf          # Nginx config with disabled buffering for SSE streams
│   ├── Dockerfile          # Multi-stage build (Node build -> Nginx prod)
│   ├── vite.config.ts      # Vite dev server and proxy config
│   └── package.json
├── docker-compose.yml       # Orchestrates frontend (:3000) and backend (:3001)
└── README.md
```

---

## 🚀 Quick Start with Docker Compose

### 1. Prerequisites
Ensure you have the following installed and running:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose enabled)
- [Ollama](https://ollama.com/) running on your host machine

Pull at least one model in Ollama:
```bash
ollama run llama3
# or
ollama run mistral
# or
ollama run qwen2.5-coder
```

> **Note for Windows / Linux users:** Ollama defaults to `127.0.0.1:11434`. To allow Docker containers to connect to your host machine's Ollama instance, ensure Ollama listens on `0.0.0.0` by setting the environment variable `OLLAMA_HOST=0.0.0.0:11434` prior to starting Ollama.

### 2. Clone and Launch Containers

```bash
git clone https://github.com/Yaromir-Anokhin/local-ai-web-client.git
cd local-ai-web-client
docker compose up -d --build
```

### 3. Access the Application
- **Web Chat UI**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:3001](http://localhost:3001)
- **Health Check**: `http://localhost:3001/api/health`

---

## 💻 Local Development Setup (Without Docker)

### Backend
```bash
cd backend
npm install
npm run dev
```
The proxy server will run on `http://localhost:3001`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will run on `http://localhost:3000` and automatically forward `/api/*` requests to `http://localhost:3001`.

---

## 🌟 Key Features

- ⚡ **Real-time Streaming**: Tokens render progressively as they are produced by the LLM without buffering delays.
- ⏹️ **Stop Generation**: Immediately abort ongoing generation via client-side `AbortController` and server connection teardown.
- 🎨 **Markdown & Code Rendering**: Full support for tables, lists, quotes, inline code, and preformatted blocks using JetBrains Mono fonts.
- 📋 **One-Click Copy**: Copy any assistant response to clipboard.
- 🔄 **Auto-Discovery of Models**: Automatically queries `/api/tags` on Ollama to populate the model picker dropdown.
- 🔒 **Privacy-First**: Zero external telemetry. All prompt data remains exclusively on your local machine.

---

## 📄 License

MIT License. Free for personal and commercial use.
