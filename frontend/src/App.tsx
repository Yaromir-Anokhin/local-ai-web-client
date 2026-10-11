import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  RotateCw, 
  Trash2, 
  Copy, 
  Check, 
  Cpu, 
  StopCircle,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: '👋 Привет! Я твой локальный AI-ассистент, работающий на локальной модели через Ollama.\n\nЗадай мне любой вопрос, попроси написать код или проанализировать данные!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('llama3');
  const [loadingModels, setLoadingModels] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  // Load models from backend
  const fetchModels = async () => {
    setLoadingModels(true);
    setConnectionError(null);
    try {
      const res = await fetch('/api/models');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        const modelNames = data.models.map((m: OllamaModel) => m.name);
        setModels(modelNames);
        if (modelNames.length > 0 && !modelNames.includes(selectedModel)) {
          setSelectedModel(modelNames[0]);
        }
      } else {
        setModels(['llama3', 'mistral', 'phi3', 'qwen2.5-coder']);
      }
    } catch (err: any) {
      console.warn('Could not fetch models from Ollama:', err.message);
      setConnectionError('Локальный сервер Ollama (localhost:11434) не найден или запускается. Используются стандартные названия моделей.');
      // Fallback defaults
      setModels(['llama3', 'llama3.2', 'mistral', 'phi3', 'qwen2.5-coder', 'deepseek-r1']);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || streaming) return;

    const userText = input.trim();
    setInput('');

    const userMsgId = 'usr-' + Date.now();
    const assistantMsgId = 'ast-' + Date.now();

    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);

    // Placeholder for assistant response
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const payloadMessages = newMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: payloadMessages,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace('data:', '').trim();
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.message?.content) {
              streamedContent += parsed.message.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: streamedContent } : m
                )
              );
            }
          } catch {
            // Ignore partial SSE parsing issues
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Fetch error:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    m.content +
                    `\n\n⚠️ **Ошибка связи:** ${err.message || 'Не удалось получить ответ от LLM'}. Убедитесь, что Ollama запущена на localhost:11434.`,
                }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.5rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
              Local AI Web Client
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Express + Ollama Streaming Engine
            </div>
          </div>
        </div>

        {/* Model selector & action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
            }}
          >
            <Cpu size={16} color="var(--accent-cyan)" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={streaming}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                outline: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {models.map((m) => (
                <option key={m} value={m} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>
                  {m}
                </option>
              ))}
            </select>
            <button
              onClick={fetchModels}
              disabled={loadingModels || streaming}
              title="Refresh models from Ollama"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RotateCw size={14} className={loadingModels ? 'spin' : ''} />
            </button>
          </div>

          <button
            onClick={handleClearHistory}
            disabled={streaming || messages.length === 0}
            title="Очистить чат"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            <span>Очистить</span>
          </button>
        </div>
      </header>

      {/* Warning banner if Ollama not reached */}
      {connectionError && (
        <div
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            borderBottom: '1px solid rgba(234, 179, 8, 0.25)',
            padding: '0.5rem 1.5rem',
            fontSize: '0.8rem',
            color: '#fde047',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{connectionError}</span>
        </div>
      )}

      {/* Chat Messages Scrollable Area */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          maxWidth: '900px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
                  }}
                >
                  <Bot size={20} />
                </div>
              )}

              <div
                style={{
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    backgroundColor: isUser ? 'var(--user-bubble)' : 'var(--assistant-bubble)',
                    border: '1px solid var(--border-color)',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '0.85rem 1.15rem',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className="markdown-body">
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)', animation: 'pulse 1.2s infinite' }} />
                          <span style={{ fontSize: '0.85rem' }}>Генерирую ответ...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.35rem',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && msg.content && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      title="Копировать сообщение"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.7rem',
                      }}
                    >
                      {copiedId === msg.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedId === msg.id ? 'Скопировано' : 'Копировать'}
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <User size={20} />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Form Area */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          backdropFilter: 'blur(12px)',
          padding: '1rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '0.5rem 0.75rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Отправить сообщение модели ${selectedModel}... (Enter для отправки, Shift+Enter для новой строки)`}
              rows={Math.min(5, Math.max(1, input.split('\n').length))}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'none',
                maxHeight: '160px',
                padding: '0.4rem 0.25rem',
              }}
            />

            {streaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.85rem',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                <StopCircle size={16} />
                <span>Стоп</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  background: input.trim()
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : '#374151',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <Send size={18} />
              </button>
            )}
          </form>

          <div
            style={{
              textAlign: 'center',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem',
            }}
          >
            Работает полностью локально. Данные не отправляются на сторонние облачные серверы.
          </div>
        </div>
      </footer>
    </div>
  );
}
