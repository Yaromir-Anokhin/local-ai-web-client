# 🤖 Local AI Web Client (Dockerized)

Легковесный, современный веб-интерфейс для работы с локальными большими языковыми моделями (LLM) через [Ollama](https://ollama.com/), полностью упакованный в Docker.

Поддерживает потоковый вывод ответов (streaming / SSE), рендеринг Markdown и блоков кода, выбор и автоопределение моделей, остановку генерации и работу без отправки данных во внешние облака.

---

## 🛠 Технологический стек

- **Фронтенд**: React 19, TypeScript, Vite, Tailwind/Modern Dark CSS, `react-markdown`, `remark-gfm`, `lucide-react`.
- **Бэкенд**: Node.js, Express, `cors`, `fetch` Streaming reader (Server-Sent Events proxy).
- **Контейнеризация**: Docker (multi-stage сборка Nginx для фронтенда), Docker Compose с `extra_hosts` для прямого подключения к локальному сервису Ollama (`http://host.docker.internal:11434`).
- **LLM Engine**: Ollama (или любой совместимый эндпоинт на порту 11434).

---

## 🏛 Архитектура проекта

```text
├── backend/
│   ├── src/
│   │   └── index.js        # Express сервер, проксирование и SSE стриминг
│   ├── Dockerfile          # Легковесный Node.js образ для бэкенда
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Полнофункциональный чат, стриминг, markdown
│   │   ├── main.tsx
│   │   └── index.css       # Темы, скроллбары, стили markdown
│   ├── nginx.conf          # Nginx конфигурация со снятой буферизацией стриминга
│   ├── Dockerfile          # Многоэтапная сборка (Node build -> Nginx prod)
│   ├── vite.config.ts      # Настройки проксирования
│   └── package.json
├── docker-compose.yml       # Оркестрация frontend:3000 и backend:3001
└── README.md
```

---

## 🚀 Быстрый запуск через Docker Compose

### 1. Предварительные требования
Убедитесь, что у вас установлены:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (с включенным Docker Compose)
- [Ollama](https://ollama.com/) (запущенная на вашей машине)

Убедитесь, что у вас загружена хотя бы одна модель в Ollama:
```bash
ollama run llama3
# или
ollama run mistral
# или
ollama run qwen2.5-coder
```

> **Важно для пользователей Windows/Linux:** Ollama по умолчанию слушает `127.0.0.1:11434`. Чтобы Docker-контейнеры могли достучаться до нее, установите переменную окружения `OLLAMA_HOST=0.0.0.0` при запуске Ollama.

### 2. Клонирование и запуск контейнеров

```bash
git clone https://github.com/Yaromir-Anokhin/local-ai-web-client.git
cd local-ai-web-client
docker compose up -d --build
```

### 3. Доступ к интерфейсу
- Веб-интерфейс чата: **[http://localhost:3000](http://localhost:3000)**
- REST API бэкенда: **[http://localhost:3001](http://localhost:3001)**
- Проверка здоровья бэкенда: `http://localhost:3001/api/health`

---

## 💻 Локальный запуск без Docker (для разработки)

### Бэкенд
```bash
cd backend
npm install
npm run dev
```
Сервер запустится на `http://localhost:3001`.

### Фронтенд
```bash
cd frontend
npm install
npm run dev
```
Vite запустится на `http://localhost:3000` и будет автоматически перенаправлять запросы `/api/*` на бэкенд `http://localhost:3001`.

---

## 🌟 Возможности веб-интерфейса

- ⚡ **Real-time Streaming**: Ответы генерируются токен за токеном без задержек.
- ⏹️ **Кнопка «Стоп»**: Мгновенный сброс стрима через `AbortController` прямо во время ответа.
- 🎨 **Markdown & Code Highlighting**: Автоматический рендеринг списков, таблиц, цитат и блоков исходного кода с моноширинными шрифтами.
- 📋 **Копирование ответов**: Быстрое копирование любого сообщения ассистента в буфер обмена.
- 🔄 **Автоопределение моделей**: Автоматический опрос эндпоинта `/api/tags` Ollama для загрузки всех установленных локально моделей в выпадающий список.
