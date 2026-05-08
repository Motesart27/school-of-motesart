export const MOTESART_IDENTITY_ANCHOR = "I don’t teach notes. I reveal patterns."

export function buildMotesartVoiceResponse({ engineDecision, conceptConfig } = {}) {
  if (engineDecision?.selectedSpeechText) return engineDecision.selectedSpeechText

  const fallbackText = conceptConfig?.speechTexts?.teach
  if (fallbackText) return fallbackText

  return 'Stay with the pattern. Watch it once, then try it back.'
}
