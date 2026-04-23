import { api } from "./api.js"

const SESSION_DELTA_CAP = 5
const RATE_LIMIT_MS = 5000
const WYL_VERSION = 1
const KEYS = ["visual", "auditory", "readwrite", "kinesthetic"]

const _lastUpdate = {}

const EVENT_SIGNALS = {
  ear_training_session: { auditory: 1.0, visual: 0.3 },
  ear_training_correct: { auditory: 1.0 },
  level_up: { auditory: 1.0 },
  games: { auditory: 0.8, visual: 0.4 },
  live_practice: { kinesthetic: 1.0 },
  sheet_music: { readwrite: 1.0, visual: 0.2 },
  homework: { readwrite: 0.8, kinesthetic: 0.2 },
  note_reading: { readwrite: 0.8, visual: 0.3 },
  pattern_recognition: { visual: 1.0, auditory: 0.2 },
}

function baseDelta(accuracy) {
  if (accuracy >= 80) return 3
  if (accuracy >= 60) return 2
  return 1
}

function normalize(scores) {
  const clamped = {}
  KEYS.forEach(k => {
    clamped[k] = Math.max(1, scores[k] || 25)
  })

  const total = KEYS.reduce((s, k) => s + clamped[k], 0)

  const result = {}
  let assigned = 0

  KEYS.forEach((k, i) => {
    if (i === KEYS.length - 1) {
      result[k] = 100 - assigned
    } else {
      result[k] = Math.round((clamped[k] / total) * 100)
      assigned += result[k]
    }
  })

  result.dominant = KEYS.reduce((a, b) =>
    result[a] >= result[b] ? a : b
  )

  return result
}

function initWYL() {
  return {
    visual: 25,
    auditory: 25,
    readwrite: 25,
    kinesthetic: 25,
    dominant: "visual",
    wyl_version: WYL_VERSION,
  }
}

function wylLog(msg, data) {
  if (typeof window !== "undefined" && window.WYL_DEBUG) {
    console.log("[WYL]", msg, data)
  }
}

export function updateWYLFromBehavior(eventType, metadata = {}) {
  let user
  try {
    user = JSON.parse(localStorage.getItem("som_user") || "null")
  } catch {
    return null
  }

  if (!user) return null

  const signals = EVENT_SIGNALS[eventType]
  if (!signals) {
    wylLog("unknown event — skipped", { eventType })
    return null
  }

  const userId = user.id || user.record_id
  const rateKey = userId || "anon"
  const now = Date.now()

  if (_lastUpdate[rateKey] && now - _lastUpdate[rateKey] < RATE_LIMIT_MS) {
    wylLog("rate limited", {
      eventType,
      cooldownMs: RATE_LIMIT_MS - (now - _lastUpdate[rateKey]),
    })
    return null
  }
  _lastUpdate[rateKey] = now

  if (!user.wyl || typeof user.wyl.visual === "undefined") {
    user = { ...user, wyl: initWYL() }
    wylLog("wyl missing — initialized with defaults", { userId: rateKey })
  }

  const before = { ...user.wyl }
  const delta = baseDelta(metadata.accuracy ?? 70)

  const current = {
    visual: user.wyl.visual || 25,
    auditory: user.wyl.auditory || 25,
    readwrite: user.wyl.readwrite || user.wyl.reading_writing || 25,
    kinesthetic: user.wyl.kinesthetic || 25,
  }

  const updated = { ...current }

  Object.entries(signals).forEach(([dim, weight]) => {
    updated[dim] =
      current[dim] +
      Math.min(SESSION_DELTA_CAP, Math.round(delta * weight))
  })

  const newWYL = normalize(updated)
  newWYL.wyl_version = (user.wyl.wyl_version || 0) + 1

  const logEntry = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    before,
    after: newWYL,
    version: newWYL.wyl_version,
  }

  wylLog("update", logEntry)

  localStorage.setItem(
    "som_user",
    JSON.stringify({ ...user, wyl: newWYL })
  )
  window.dispatchEvent(new CustomEvent("wyl:update", { detail: newWYL }))

  if (userId && api.updateWYLFromBehavior) {
    api.updateWYLFromBehavior(userId, eventType, {
      ...metadata,
      ...newWYL,
    }).catch(() => {})
  }

  return newWYL
}
