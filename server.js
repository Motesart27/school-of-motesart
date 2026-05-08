import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = [
  'https://school-of-motesart.netlify.app',
  'https://motesart-frontend-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000'
]

// MUST be first middleware
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // HANDLE PREFLIGHT DIRECTLY
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

// THEN JSON
app.use(express.json())

/* ────────────────────────────────────────────
   TTS Proxy  –  POST /api/tts/speak
   Body: { text: string, voice: 'coach' | 'tami' }
   Returns: audio/mpeg stream
   ──────────────────────────────────────────── */
app.post('/api/tts/speak', async (req, res) => {
  const { text, voice } = req.body;

  if (!text || text.length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: 'text too long (max 5000 chars)' });
  }

  const voiceMap = {
    coach: process.env.ELEVENLABS_VOICE_ID,
    tami:  process.env.ELEVENLABS_TAMI_VOICE_ID,
  };
  const voiceId = voiceMap[voice] || voiceMap.coach;

  const envPresence = {
    hasApiKey: !!process.env.ELEVENLABS_API_KEY,
    hasCoachVoice: !!process.env.ELEVENLABS_VOICE_ID,
    hasTamiVoice: !!process.env.ELEVENLABS_TAMI_VOICE_ID,
  };
  console.log('[TTS] env presence:', JSON.stringify(envPresence), '| voiceId present:', !!voiceId);

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'TTS not configured' });
  }

  try {
    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elResponse.ok) {
      const elevenStatus = elResponse.status;
      const elevenBody = await elResponse.text();
      console.error('[ElevenLabs TTS]', elevenStatus, elevenBody);
      return res.status(elevenStatus).json({ error: 'TTS generation failed', status: elevenStatus, detail: elevenBody });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = elResponse.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    await pump();
  } catch (err) {
    console.error('TTS proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ── Voice list ── */
app.get('/api/tts/voices', (_req, res) => {
  res.json({
    voices: [
      { id: 'coach', name: 'Motesart', description: 'Piano coach voice' },
      { id: 'tami',  name: 'T.A.M.i', description: 'AI assistant voice' },
    ],
  });
});

/* ── Health check ── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ────────────────────────────────────────────
   Backend API Proxy  –  /api/*
   Forwards to Railway backend (skips /api/tts and /api/health handled above)
   ──────────────────────────────────────────── */
const BACKEND_URL = process.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app';

app.all('/api/*', async (req, res) => {
  const backendPath = req.path.replace(/^\/api/, '');
  const targetUrl = `${BACKEND_URL}${backendPath}`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const backendRes = await fetch(targetUrl, fetchOptions);
    const contentType = backendRes.headers.get('content-type') || '';

    res.status(backendRes.status);
    if (contentType.includes('application/json')) {
      const data = await backendRes.json();
      res.json(data);
    } else {
      const text = await backendRes.text();
      res.set('Content-Type', contentType);
      res.send(text);
    }
  } catch (err) {
    console.error('API proxy error:', req.method, targetUrl, err.message);
    res.status(502).json({ detail: 'Backend unavailable' });
  }
});

/* ────────────────────────────────────────────
   Serve Vite static build  +  SPA fallback
   ──────────────────────────────────────────── */
app.use(express.static(join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Motesart server running on port ${PORT}`);
});
