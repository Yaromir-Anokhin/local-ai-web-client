const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ollamaHost: OLLAMA_HOST });
});

// List local models from Ollama
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching models from Ollama:', error.message);
    res.status(502).json({
      error: 'Failed to connect to local Ollama instance',
      details: error.message,
      models: []
    });
  }
});

// Chat completion with streaming support
app.post('/api/chat', async (req, res) => {
  const { model, messages, stream = true } = req.body;

  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required parameters: model and messages array' });
  }

  try {
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    if (!ollamaResponse.ok) {
      const errText = await ollamaResponse.text();
      return res.status(ollamaResponse.status).json({
        error: `Ollama error: ${errText || ollamaResponse.statusText}`,
      });
    }

    if (stream) {
      // Set SSE / streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = ollamaResponse.body.getReader();
      const decoder = new TextDecoder();

      req.on('close', () => {
        reader.cancel();
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Forward chunks as Server-Sent Events or line-delimited JSON
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');
        for (const line of lines) {
          res.write(`data: ${line}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const data = await ollamaResponse.json();
      res.json(data);
    }
  } catch (error) {
    console.error('Chat error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to communicate with LLM engine', details: error.message });
    } else {
      res.end();
    }
  }
});

// Simple generate endpoint with streaming support
app.post('/api/generate', async (req, res) => {
  const { model, prompt, stream = true } = req.body;

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Missing required parameters: model and prompt' });
  }

  try {
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream,
      }),
    });

    if (!ollamaResponse.ok) {
      const errText = await ollamaResponse.text();
      return res.status(ollamaResponse.status).json({
        error: `Ollama error: ${errText || ollamaResponse.statusText}`,
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = ollamaResponse.body.getReader();
      const decoder = new TextDecoder();

      req.on('close', () => {
        reader.cancel();
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');
        for (const line of lines) {
          res.write(`data: ${line}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const data = await ollamaResponse.json();
      res.json(data);
    }
  } catch (error) {
    console.error('Generate error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to communicate with LLM engine', details: error.message });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Local AI Backend proxy running on port ${PORT}`);
  console.log(`📡 Forwarding LLM requests to ${OLLAMA_HOST}`);
});
