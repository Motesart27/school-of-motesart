/**
 * ttsService.js — Motesart ElevenLabs Voice Integration
 *
 * Calls POST /api/tts/speak (proxied through Netlify → Railway)
 * Voice: Mark (coach), Model: eleven_flash_v2_5
 * Returns audio blob URL for playback
 *
 * Features:
 * - Session cache: repeated phrases served instantly from memory
 * - Preload: pre-fetch likely next lines before they're needed
 * - Duration: read audio length to sync typing animation
 */

const TTS_ENDPOINT = '/api/tts/speak';

/** Session cache: text → blobUrl (never revoked while cached) */
const _cache = new Map();

/**
 * Fetch TTS audio — returns cached blob URL if available
 */
export async function fetchTTSAudio(text, voice = 'coach') {
  if (!text || text.length === 0) return null;

  const cacheKey = `${voice}:${text}`;
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (!res.ok) {
      console.warn('[TTS] Server returned', res.status);
      return null;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    _cache.set(cacheKey, blobUrl);
    return blobUrl;
  } catch (err) {
    console.warn('[TTS] Fetch failed:', err.message);
    return null;
  }
}

/**
 * Preload an array of text strings into cache (fire-and-forget)
 * @param {string[]} texts
 * @param {string} voice
 */
export function preloadTTS(texts, voice = 'coach') {
  if (!texts || !Array.isArray(texts)) return;
  texts.forEach(text => {
    if (text && typeof text === 'string') {
      const cacheKey = `${voice}:${text}`;
      if (!_cache.has(cacheKey)) {
        fetchTTSAudio(text, voice); // fire-and-forget — result goes into cache
      }
    }
  });
}

/**
 * Get audio duration in milliseconds from a blob URL
 * @param {string} blobUrl
 * @returns {Promise<number>} duration in ms (defaults to 0 on error)
 */
export function getAudioDuration(blobUrl) {
  return new Promise((resolve) => {
    if (!blobUrl) { resolve(0); return; }
    const audio = new Audio(blobUrl);
    audio.addEventListener('loadedmetadata', () => {
      const ms = (audio.duration || 0) * 1000;
      resolve(ms);
    });
    audio.addEventListener('error', () => resolve(0));
    // Timeout fallback — don't hang forever
    setTimeout(() => resolve(0), 3000);
  });
}

/**
 * Play audio from a blob URL
 * IMPORTANT: Do NOT revoke cached URLs on playback end
 */
export function playAudio(blobUrl, { onStart, onEnd, onError } = {}) {
  const audio = new Audio(blobUrl);
  let stopped = false;
  const isCached = [..._cache.values()].includes(blobUrl);

  audio.addEventListener('play', () => {
    if (!stopped) onStart?.();
  });
  audio.addEventListener('ended', () => {
    if (!stopped) {
      if (!isCached) URL.revokeObjectURL(blobUrl);
      onEnd?.();
    }
  });
  audio.addEventListener('error', (e) => {
    if (!stopped) {
      if (!isCached) URL.revokeObjectURL(blobUrl);
      onError?.(e);
    }
  });

  audio.play().catch(err => {
    console.warn('[TTS] Playback blocked:', err.message);
    if (!stopped) onError?.(err);
  });

  return {
    audio,
    stop: () => {
      if (stopped) return;
      stopped = true;
      audio.pause();
      audio.currentTime = 0;
      if (!isCached) URL.revokeObjectURL(blobUrl);
      // NOTE: do NOT call onEnd() here
    }
  };
}
