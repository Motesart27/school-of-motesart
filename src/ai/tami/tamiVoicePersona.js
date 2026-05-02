export const TAMI_IDENTITY_ANCHOR = 'T.A.M.i runs the school. Motesart teaches the music.'

export function buildTamiVoiceResponse({ output } = {}) {
  const text = output?.speechText || output?.responseText || 'All signals nominal. No intervention needed.'
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
}
