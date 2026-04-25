/**
 * useTextToSpeech.js — React hook for ElevenLabs TTS via server proxy
 * Uses Web Audio API (AudioContext) for playback — bypasses browser autoplay restrictions
 * PRONUNCIATION: Preprocesses text for correct name pronunciation
 *
 * Usage:
 *   const { speak, stop, isSpeaking, isLoading, error } = useTextToSpeech()
 */
import { useState, useCallback, useRef } from 'react'

// Pronunciation map for correct TTS rendering
const PRONUNCIATION_MAP = {
  'Motesart': 'Motes Art',
  'motesart': 'Motes Art',
  'MOTESART': 'Motes Art',
}

function preprocessText(text) {
  let result = text
  for (const [original, replacement] of Object.entries(PRONUNCIATION_MAP)) {
    result = result.split(original).join(replacement)
  }
  return result
}

export default function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const abortRef   = useRef(null)   // AbortController for fetch
  const sourceRef  = useRef(null)   // AudioBufferSourceNode (currently playing)
  const contextRef = useRef(null)   // Shared AudioContext

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch (_) {}
      sourceRef.current = null
    }
    // Keep contextRef alive — closing and re-creating AudioContext each time
    // causes latency; only close if truly done
    setIsSpeaking(false)
    setIsLoading(false)
  }, [])

  const speak = useCallback(async (text, voice = 'coach') => {
    if (!text || text.trim().length === 0) return

    stop()
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const speechText = preprocessText(text)

      const ttsUrl = import.meta.env.VITE_RAILWAY_URL
        ? `${import.meta.env.VITE_RAILWAY_URL}/api/tts/speak`
        : '/api/tts/speak'
      console.log('[TTS] calling', ttsUrl, 'text length:', speechText.length)
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText, voice }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `TTS failed (HTTP ${response.status})`)
      }

      // Collect all audio chunks from streaming response
      const reader = response.body.getReader()
      const chunks = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      if (chunks.length === 0) throw new Error('No audio data received')
      console.log('[TTS] audio received, chunks:', chunks.length)

      // Guard: stop() may have been called while we were fetching
      if (abortRef.current !== controller) return

      // Decode via Web Audio API — works regardless of autoplay policy
      if (!contextRef.current || contextRef.current.state === 'closed') {
        contextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = contextRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      const blob = new Blob(chunks, { type: 'audio/mpeg' })
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

      // Guard again after async decoding
      if (abortRef.current !== controller) return

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => {
        setIsSpeaking(false)
        sourceRef.current = null
      }

      sourceRef.current = source
      setIsLoading(false)
      setIsSpeaking(true)
      source.start(0)
      console.log('[TTS] playback started')

    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('[TTS] error:', err)
      setError(err.message || 'TTS failed')
      setIsSpeaking(false)
      setIsLoading(false)
    }
  }, [stop])

  // Unlock AudioContext on user gesture — call from onClick before async TTS
  const unlock = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      contextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume()
    }
  }, [])

  return { speak, stop, unlock, isSpeaking, isLoading, error }
}
