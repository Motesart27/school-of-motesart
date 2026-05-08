/**
 * useMotesartVoice.js — React hook for Motesart TTS
 *
 * Clean voice path:
 * 1. speak(text) → fetch audio → sync typing to audio duration → play
 * 2. Each speak() cancels any in-flight request/audio via speakId
 * 3. Uses global interaction flag so "Start Lesson" click works
 * 4. Session cache: repeated phrases play instantly
 * 5. Preload: chapters pre-fetch likely next lines
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchTTSAudio, playAudio, preloadTTS, getAudioDuration } from '../services/ttsService.js';

/**
 * Global interaction flag — survives across component mounts
 */
if (!window.__motesartInteracted) {
  window.__motesartInteracted = false;
  const mark = () => { window.__motesartInteracted = true; };
  document.addEventListener('click', mark, { capture: true });
  document.addEventListener('touchstart', mark, { capture: true });
}

export default function useMotesartVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const fullTextRef = useRef('');
  const blobUrlRef = useRef(null);
  const speakIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      // Don't revoke blobUrlRef — it may be cached
    };
  }, []);

  const cancelAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.stop();
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Don't revoke blobUrlRef — cache manages its own lifecycle
    blobUrlRef.current = null;
  }, []);

  const playReady = useCallback(() => {
    if (!blobUrlRef.current) return;
    const id = speakIdRef.current;

    setIsSpeaking(true);
    setAudioReady(false);
    audioRef.current = playAudio(blobUrlRef.current, {
      onEnd: () => {
        if (speakIdRef.current !== id) return;
        audioRef.current = null;
        blobUrlRef.current = null;
        setIsSpeaking(false);
        setIsDone(true);
        setTypedText(fullTextRef.current);
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      },
      onError: () => {
        if (speakIdRef.current !== id) return;
        audioRef.current = null;
        blobUrlRef.current = null;
        setIsSpeaking(false);
        setAudioReady(false);
      }
    });
  }, []);

  /**
   * Start typing animation with calculated speed
   */
  const startTyping = useCallback((text, typingSpeed, id) => {
    let charIndex = 0;
    const typeNext = () => {
      if (speakIdRef.current !== id) return;
      if (charIndex < text.length) {
        charIndex++;
        setTypedText(text.slice(0, charIndex));
        const ch = text[charIndex - 1];
        const pause = (ch === '.' || ch === ',' || ch === '\u2014')
          ? typingSpeed * 3.5
          : typingSpeed + (Math.random() * typingSpeed * 0.6);
        timerRef.current = setTimeout(typeNext, pause);
      } else {
        timerRef.current = null;
        if (!audioRef.current) {
          setIsSpeaking(false);
          setIsDone(true);
        }
      }
    };
    typeNext();
  }, []);

  /**
   * Speak text with typing synced to audio duration
   */
  const speak = useCallback(async (text, { muted = false } = {}) => {
    if (!text) return;

    const id = ++speakIdRef.current;
    cancelAll();

    setTypedText('');
    setIsDone(false);
    setIsSpeaking(false);
    setIsLoading(false);
    setAudioReady(false);
    fullTextRef.current = text;

    if (muted) {
      // Muted: just type at default speed
      startTyping(text, 35, id);
      return;
    }

    setIsLoading(true);
    const blobUrl = await fetchTTSAudio(text, 'coach');

    if (speakIdRef.current !== id) {
      return; // cancelled while fetching — don't revoke, might be cached
    }
    setIsLoading(false);

    if (!blobUrl) {
      // Fetch failed — type at default speed
      startTyping(text, 35, id);
      return;
    }

    // Get audio duration to sync typing speed
    const durationMs = await getAudioDuration(blobUrl);
    if (speakIdRef.current !== id) return;

    // Calculate typing speed: spread chars across ~85% of audio duration
    // (leave 15% buffer so typing finishes slightly before audio ends)
    let typingSpeed = 35; // fallback
    if (durationMs > 0 && text.length > 0) {
      typingSpeed = Math.round((durationMs * 0.85) / text.length);
      typingSpeed = Math.max(18, Math.min(60, typingSpeed));
    }

    // Start typing with synced speed
    startTyping(text, typingSpeed, id);

    // Can we autoplay?
    if (window.__motesartInteracted) {
      setIsSpeaking(true);
      audioRef.current = playAudio(blobUrl, {
        onEnd: () => {
          if (speakIdRef.current !== id) return;
          audioRef.current = null;
          setIsSpeaking(false);
          setTypedText(text);
          if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
          setIsDone(true);
        },
        onError: () => {
          if (speakIdRef.current !== id) return;
          audioRef.current = null;
          setIsSpeaking(false);
        }
      });
    } else {
      blobUrlRef.current = blobUrl;
      setAudioReady(true);
    }
  }, [cancelAll, startTyping]);

  const stop = useCallback(() => {
    speakIdRef.current++;
    cancelAll();
    setIsSpeaking(false);
    setIsLoading(false);
    setAudioReady(false);
    setTypedText(fullTextRef.current);
    setIsDone(true);
  }, [cancelAll]);

  const replay = useCallback(() => {
    if (fullTextRef.current) {
      window.__motesartInteracted = true;
      speak(fullTextRef.current);
    }
  }, [speak]);

  /** Pre-fetch lines into cache for instant playback later */
  const preload = useCallback((texts) => {
    preloadTTS(texts, 'coach');
  }, []);

  return {
    speak,
    stop,
    replay,
    playReady,
    preload,
    isSpeaking,
    isLoading,
    typedText,
    isDone,
    audioReady,
  };
}
