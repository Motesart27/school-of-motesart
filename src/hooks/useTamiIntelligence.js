import { useCallback, useMemo } from 'react'
import { normalizeTamiSignals } from '../ai/tami/tamiSignalIntakeEngine.js'
import { runTamiDecisionEngine } from '../ai/tami/tamiDecisionEngine.js'
import { formTamiOutput } from '../ai/tami/tamiOutputFormation.js'
import { buildTamiVoiceResponse } from '../ai/tami/tamiVoicePersona.js'

export function useTamiIntelligence(defaultContext = {}) {
  const stableDefaults = useMemo(() => defaultContext, [defaultContext])

  const evaluateTamiIntelligence = useCallback((input = {}) => {
    const signals = normalizeTamiSignals({ ...stableDefaults, ...input })
    const decision = runTamiDecisionEngine(signals)
    const output = formTamiOutput({ decision, signals })
    const speechText = buildTamiVoiceResponse({ output })

    return {
      signals,
      decision,
      output: {
        ...output,
        speechText
      }
    }
  }, [stableDefaults])

  return { evaluateTamiIntelligence }
}

export default useTamiIntelligence
