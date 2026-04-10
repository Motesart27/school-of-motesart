import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getState } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'
import MetronomeControl from '../components/MetronomeControl.jsx'

// T_MAJOR_SCALE_PATTERN chapters
import FindItChapter from './FindItChapter.jsx'
import PlayItChapter from './PlayItChapter.jsx'
import MoveItChapter from './MoveItChapter.jsx'
import OwnItChapter from './OwnItChapter.jsx'

// T_SCALE_DEGREES_MAJOR chapters
import ScaleDegreesFindIt from './ScaleDegreesFindIt.jsx'
import ScaleDegreesPlayIt from './ScaleDegreesPlayIt.jsx'
import ScaleDegreesMoveIt from './ScaleDegreesMoveIt.jsx'
import ScaleDegreesOwnIt from './ScaleDegreesOwnIt.jsx'

// T_HALF_STEP chapters
import HalfStepFindIt from './HalfStepFindIt.jsx'
import HalfStepPlayIt from './HalfStepPlayIt.jsx'
import HalfStepMoveIt from './HalfStepMoveIt.jsx'
import HalfStepOwnIt from './HalfStepOwnIt.jsx'

/**
 * PracticeChapterWrapper
 * Thin wrapper for /practice/:conceptId
 * Determines which chapter to render based on concept state.
 * Enforces prerequisite rules between concepts.
 */

const API_BASE = 'https://motesart-converter.netlify.app'

const PREREQUISITES = {
  T_SCALE_DEGREES_MAJOR: {
    requires: 'T_MAJOR_SCALE_PATTERN',
    message: 'Finish the major scale pattern first. Then the degrees will make sense.'
  },
  T_HALF_STEP: {
    requires: 'T_SCALE_DEGREES_MAJOR',
    message: 'Finish the scale degrees first. Then the half steps will click.'
  }
}

const CHAPTER_MESSAGES = {
  find_it: 'Look and listen closely. Find the notes on the keyboard!',
  play_it: 'Now play along! Match the rhythm and stay in time.',
  move_it: 'Feel the movement. Let your body connect with the music.',
  own_it: 'Make it yours. You know this \u2014 show it!'
}

export default function PracticeChapterWrapper() {
  const { conceptId } = useParams()
  const [chapter, setChapter] = useState('find_it')
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadState() {
      setLoading(true)
      setLocked(null)

      // Check prerequisites
      const prereq = PREREQUISITES[conceptId]
      if (prereq) {
        try {
          const resp = await fetch(API_BASE + '/concept-state/demo-student/' + prereq.requires)
          if (resp.ok) {
            const data = await resp.json()
            if (!data.current_level || data.current_level === 'Not Started') {
              setLocked(prereq.message)
              setLoading(false)
              return
            }
          }
        } catch (e) {
          // API down \u2014 allow through with local state
        }
      }

      // Load current chapter from concept state
      try {
        const resp = await fetch(API_BASE + '/concept-state/demo-student/' + conceptId)
        if (resp.ok) {
          const data = await resp.json()
          if (data.chapter) {
            if (!cancelled) setChapter(data.chapter)
          }
        }
      } catch (e) {
        // API down \u2014 default to find_it
      }

      if (!cancelled) setLoading(false)
    }

    loadState()
    return () => { cancelled = true }
  }, [conceptId])

  const isWarm = conceptId === 'T_HALF_STEP'
  const bgColor = isWarm ? '#F6F4EF' : '#0a0a14'
  const textColor = isWarm ? '#94A3B8' : '#64748b'

  if (loading) {
    return (
      <div style={{
        background: bgColor, color: textColor, minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
        fontSize: 14
      }}>
        Loading chapter...
      </div>
    )
  }

  if (locked) {
    return (
      <div style={{
        background: bgColor, color: isWarm ? '#D97706' : '#f59e0b', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
        padding: 40, textAlign: 'center'
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>\ud83d\udd12</div>
        <div style={{ fontSize: 15, maxWidth: 360, lineHeight: 1.5 }}>{locked}</div>
      </div>
    )
  }

  // Resolve chapter component
  const concept = conceptId
  let ChapterContent = null

  if (concept === 'T_MAJOR_SCALE_PATTERN') {
    if (chapter === 'find_it') ChapterContent = FindItChapter
    else if (chapter === 'play_it') ChapterContent = PlayItChapter
    else if (chapter === 'move_it') ChapterContent = MoveItChapter
    else if (chapter === 'own_it') ChapterContent = OwnItChapter
    else ChapterContent = FindItChapter
  } else if (concept === 'T_SCALE_DEGREES_MAJOR') {
    if (chapter === 'find_it') ChapterContent = ScaleDegreesFindIt
    else if (chapter === 'play_it') ChapterContent = ScaleDegreesPlayIt
    else if (chapter === 'move_it') ChapterContent = ScaleDegreesMoveIt
    else if (chapter === 'own_it') ChapterContent = ScaleDegreesOwnIt
    else ChapterContent = ScaleDegreesFindIt
  } else if (concept === 'T_HALF_STEP') {
    if (chapter === 'find_it') ChapterContent = HalfStepFindIt
    else if (chapter === 'play_it') ChapterContent = HalfStepPlayIt
    else if (chapter === 'move_it') ChapterContent = HalfStepMoveIt
    else if (chapter === 'own_it') ChapterContent = HalfStepOwnIt
    else ChapterContent = HalfStepFindIt
  }

  if (!ChapterContent) {
    return (
      <div style={{
        background: '#0a0a14', color: '#ef4444', minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'sans-serif',
        fontSize: 14
      }}>
        Unknown concept: {conceptId}
      </div>
    )
  }

  const tamiMsg = CHAPTER_MESSAGES[chapter] || CHAPTER_MESSAGES.find_it
  const metronomeDefault = chapter === 'play_it' || chapter === 'move_it'
  const ambassadorQuiet = chapter === 'own_it'
  const isHalfStep = concept === 'T_HALF_STEP'

  // HalfStep chapters manage their own coach, controls, and layout
  if (isHalfStep) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#F6F4EF' }}>
        <ChapterContent currentChapter={chapter} onChapterChange={setChapter} />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0a0a14' }}>
      {/* Metronome control \u2014 top right */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 900 }}>
        <MetronomeControl bpm={72} defaultOn={metronomeDefault} />
      </div>

      {/* Chapter content */}
      <ChapterContent />

      {/* Ambassador bubble \u2014 bottom right */}
      <AmbassadorBubble
        message={tamiMsg}
        ambassadorId="motesart"
        quiet={ambassadorQuiet}
      />
    </div>
  )
}
