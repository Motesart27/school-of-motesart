/**
 * ============================================================
 * TEACHING VISUAL COMPONENTS
 * ============================================================
 *
 * SVG-based piano teaching visuals used by the lesson engine.
 * All components use viewBox for responsive scaling across
 * any viewport size. Data is driven by props from the
 * orchestrator and strategy resolver.
 *
 * Components:
 *   KeyboardDiagram     — Piano keyboard with highlights, labels, step overlay
 *   FingerMapDiagram    — Hand outline with numbered fingers
 *   ScalePathDiagram    — Node chain showing scale notes + W/H formula
 *   HalfWholeStepDiagram — Zoomed half/whole step comparison
 *   VisualOverlay       — Container that maps asset IDs → components
 *
 * ============================================================
 */

// ── Constants ──
export const WHITE_KEYS = ['C','D','E','F','G','A','B']
export const BLACK_KEY_OFFSETS = { 'C#':1, 'D#':2, 'F#':4, 'G#':5, 'A#':6 }
export const C_MAJOR_NOTES = ['C','D','E','F','G','A','B','C2']
export const FINGER_NUMBERS = { 'C':1, 'D':2, 'E':3, 'F':1, 'G':2, 'A':3, 'B':4, 'C2':5 }
export const STEP_PATTERN = ['W','W','H','W','W','W','H']

// ═══════════════════════════════════════════════════════════════
// KEYBOARD DIAGRAM
// ═══════════════════════════════════════════════════════════════

export function KeyboardDiagram({ highlightKeys, showMiddleC, showArrow, showNumbers, showSteps, activeNote, mode }) {
  const wkW = 42, wkH = 140, bkW = 26, bkH = 85
  const totalW = wkW * 7 + 2
  const highlights = highlightKeys || (mode === 'c_major' ? C_MAJOR_NOTES : [])

  return (
    <svg viewBox={`0 0 ${totalW + 20} ${wkH + 50}`} style={{ width: '100%', maxWidth: 500, height: 'auto' }}>
      {WHITE_KEYS.map((note, i) => {
        const x = 10 + i * wkW
        const isHighlighted = highlights.includes(note) || highlights.includes(note + '2')
        const isActive = activeNote === note
        const isMiddleC = note === 'C' && showMiddleC
        return (
          <g key={note}>
            <rect
              x={x} y={10} width={wkW - 2} height={wkH} rx={3}
              fill={isActive ? '#00D4AA' : isHighlighted ? 'rgba(0,212,170,0.25)' : 'rgba(255,255,255,0.9)'}
              stroke={isHighlighted ? '#00C49A' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isHighlighted ? 2 : 1}
              style={{ transition: 'fill 0.3s' }}
            />
            <text x={x + (wkW - 2) / 2} y={wkH - 4} textAnchor="middle"
              fill={isActive ? '#fff' : isHighlighted ? '#00C49A' : '#333'}
              fontSize={12} fontWeight={isHighlighted ? 700 : 500} fontFamily="Outfit, sans-serif">
              {note === 'C' && showNumbers ? 'C (1)' : showNumbers && FINGER_NUMBERS[note] ? `${note} (${FINGER_NUMBERS[note]})` : note}
            </text>
            {isMiddleC && showArrow && (
              <g>
                <line x1={x + (wkW - 2) / 2} y1={wkH + 20} x2={x + (wkW - 2) / 2} y2={wkH + 40}
                  stroke="#e84b8a" strokeWidth={2} markerEnd="url(#arrowhead)" />
                <text x={x + (wkW - 2) / 2} y={wkH + 48} textAnchor="middle"
                  fill="#e84b8a" fontSize={10} fontWeight={700} fontFamily="Outfit, sans-serif">
                  Middle C
                </text>
              </g>
            )}
          </g>
        )
      })}
      {Object.entries(BLACK_KEY_OFFSETS).map(([note, pos]) => {
        const x = 10 + pos * wkW - bkW / 2
        return (
          <rect key={note} x={x} y={10} width={bkW} height={bkH} rx={2}
            fill="rgba(20,20,40,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        )
      })}
      {showSteps && STEP_PATTERN.map((step, i) => {
        if (i >= 7) return null
        const x1 = 10 + i * wkW + wkW / 2
        const x2 = 10 + (i + 1) * wkW + wkW / 2
        const midX = (x1 + x2) / 2
        const isHalf = step === 'H'
        return (
          <g key={`step-${i}`}>
            <line x1={x1} y1={wkH + 20} x2={x2} y2={wkH + 20}
              stroke={isHalf ? '#e84b8a' : '#00C49A'} strokeWidth={2} strokeDasharray={isHalf ? '4,3' : 'none'} />
            <text x={midX} y={wkH + 35} textAnchor="middle"
              fill={isHalf ? '#e84b8a' : '#00C49A'} fontSize={10} fontWeight={700} fontFamily="Outfit, sans-serif">
              {step}
            </text>
          </g>
        )
      })}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#e84b8a" />
        </marker>
      </defs>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// FINGER MAP DIAGRAM
// ═══════════════════════════════════════════════════════════════

export function FingerMapDiagram({ showNumbers, showGhost, mode }) {
  const fingers = [
    { id: 1, label: 'Thumb', cx: 58, cy: 90, note: 'C' },
    { id: 2, label: 'Index', cx: 78, cy: 40, note: 'D' },
    { id: 3, label: 'Middle', cx: 100, cy: 28, note: 'E' },
    { id: 4, label: 'Ring', cx: 122, cy: 42, note: 'F' },
    { id: 5, label: 'Pinky', cx: 142, cy: 60, note: 'G' },
  ]

  return (
    <svg viewBox="0 0 200 160" style={{ width: '100%', maxWidth: 320, height: 'auto' }}>
      <path d="M45,130 Q35,110 50,85 Q55,70 55,60 Q55,45 65,35 Q72,28 78,32 L78,20 Q78,8 88,8 Q98,8 98,20 L98,15 Q98,2 108,2 Q118,2 118,15 L118,22 Q118,10 128,10 Q138,10 138,22 L138,50 Q148,35 158,42 Q165,48 155,70 Q145,95 145,110 Q145,130 130,140 L65,140 Q45,140 45,130 Z"
        fill={showGhost ? 'rgba(232,75,138,0.08)' : 'rgba(255,255,255,0.06)'}
        stroke={showGhost ? 'rgba(232,75,138,0.4)' : 'rgba(255,255,255,0.15)'}
        strokeWidth={1.5} />
      {fingers.map(f => (
        <g key={f.id}>
          <circle cx={f.cx} cy={f.cy} r={14}
            fill="rgba(0,196,154,0.2)" stroke="#00C49A" strokeWidth={1.5} />
          <text x={f.cx} y={f.cy + 1} textAnchor="middle" dominantBaseline="central"
            fill="#00D4AA" fontSize={14} fontWeight={800} fontFamily="Outfit, sans-serif">
            {f.id}
          </text>
          {showNumbers && (
            <text x={f.cx} y={f.cy + 22} textAnchor="middle"
              fill="rgba(255,255,255,0.5)" fontSize={8} fontWeight={600} fontFamily="DM Sans, sans-serif">
              {f.note}
            </text>
          )}
        </g>
      ))}
      <text x={100} y={155} textAnchor="middle"
        fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="DM Sans, sans-serif">
        Right hand — thumb starts on C
      </text>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// SCALE PATH DIAGRAM
// ═══════════════════════════════════════════════════════════════

export function ScalePathDiagram({ scale, showFormula, mode }) {
  const notes = scale || C_MAJOR_NOTES
  const nodeR = 18, gap = 54, padX = 30, padY = 25
  const totalW = padX * 2 + (notes.length - 1) * gap

  return (
    <svg viewBox={`0 0 ${totalW} 100`} style={{ width: '100%', maxWidth: 540, height: 'auto' }}>
      {notes.slice(0, -1).map((_, i) => {
        const x1 = padX + i * gap
        const x2 = padX + (i + 1) * gap
        const isHalf = STEP_PATTERN[i] === 'H'
        return (
          <line key={`line-${i}`} x1={x1} y1={padY + 20} x2={x2} y2={padY + 20}
            stroke={isHalf ? '#e84b8a' : 'rgba(0,196,154,0.4)'}
            strokeWidth={isHalf ? 2.5 : 2}
            strokeDasharray={isHalf ? '5,4' : 'none'} />
        )
      })}
      {notes.map((note, i) => {
        const x = padX + i * gap
        const displayNote = note.replace('2', '')
        return (
          <g key={`node-${i}`}>
            <circle cx={x} cy={padY + 20} r={nodeR}
              fill="rgba(0,196,154,0.15)" stroke="#00C49A" strokeWidth={2} />
            <text x={x} y={padY + 21} textAnchor="middle" dominantBaseline="central"
              fill="#00D4AA" fontSize={13} fontWeight={700} fontFamily="Outfit, sans-serif">
              {displayNote}
            </text>
            {FINGER_NUMBERS[note] && (
              <text x={x} y={padY + 48} textAnchor="middle"
                fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="DM Sans, sans-serif">
                finger {FINGER_NUMBERS[note]}
              </text>
            )}
          </g>
        )
      })}
      {showFormula && STEP_PATTERN.map((step, i) => {
        if (i >= notes.length - 1) return null
        const midX = padX + i * gap + gap / 2
        const isHalf = step === 'H'
        return (
          <text key={`step-${i}`} x={midX} y={padY - 2} textAnchor="middle"
            fill={isHalf ? '#e84b8a' : 'rgba(0,196,154,0.7)'} fontSize={10} fontWeight={700}
            fontFamily="Outfit, sans-serif">
            {step}
          </text>
        )
      })}
      {showFormula && (
        <text x={totalW / 2} y={padY + 75} textAnchor="middle"
          fill="rgba(255,255,255,0.3)" fontSize={10} fontFamily="DM Sans, sans-serif">
          W = Whole step | H = Half step
        </text>
      )}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// HALF/WHOLE STEP DIAGRAM
// ═══════════════════════════════════════════════════════════════

export function HalfWholeStepDiagram({ type, animated }) {
  const isHalf = type === 'half'
  const label = isHalf ? 'Half Step (1 key)' : 'Whole Step (2 keys)'
  const color = isHalf ? '#e84b8a' : '#00C49A'
  const notes = isHalf ? ['E', 'F'] : ['C', 'D']
  const skipLabel = isHalf ? '' : 'C#'

  return (
    <svg viewBox="0 0 260 120" style={{ width: '100%', maxWidth: 360, height: 'auto' }}>
      <rect x={30} y={10} width={80} height={70} rx={4}
        fill="rgba(255,255,255,0.9)" stroke={color} strokeWidth={2} />
      <rect x={150} y={10} width={80} height={70} rx={4}
        fill="rgba(255,255,255,0.9)" stroke={color} strokeWidth={2} />
      {!isHalf && (
        <rect x={115} y={10} width={30} height={45} rx={2}
          fill="rgba(20,20,40,0.95)" stroke="rgba(255,255,255,0.15)" strokeWidth={1}>
          {animated && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />}
        </rect>
      )}
      <text x={70} y={65} textAnchor="middle" fill="#333" fontSize={16} fontWeight={700} fontFamily="Outfit">{notes[0]}</text>
      <text x={190} y={65} textAnchor="middle" fill="#333" fontSize={16} fontWeight={700} fontFamily="Outfit">{notes[1]}</text>
      {!isHalf && <text x={130} y={42} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={9} fontFamily="DM Sans">{skipLabel}</text>}
      <path d={`M 70 90 Q 130 105 190 90`} fill="none" stroke={color} strokeWidth={2.5}
        markerEnd="url(#stepArrow)" />
      <defs>
        <marker id="stepArrow" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={color} />
        </marker>
      </defs>
      <text x={130} y={115} textAnchor="middle" fill={color} fontSize={12} fontWeight={700} fontFamily="Outfit">
        {label}
      </text>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// VISUAL ASSET MAPPING
// ═══════════════════════════════════════════════════════════════

export const VISUAL_COMPONENT_MAP = {
  'numbered_keyboard':         (p) => <KeyboardDiagram showNumbers mode="numbered" {...p} />,
  'keyboard_middle_c':         (p) => <KeyboardDiagram showMiddleC highlightKeys={['C']} {...p} />,
  'keyboard_middle_c_arrow':   (p) => <KeyboardDiagram showMiddleC showArrow highlightKeys={['C']} {...p} />,
  'half_step_demo':            (p) => <HalfWholeStepDiagram type="half" {...p} />,
  'half_step_animated_arrows': (p) => <HalfWholeStepDiagram type="half" animated {...p} />,
  'whole_step_demo':           (p) => <HalfWholeStepDiagram type="whole" {...p} />,
  'scale_pattern_overlay':     (p) => <KeyboardDiagram showSteps highlightKeys={C_MAJOR_NOTES} mode="c_major" {...p} />,
  'cmaj_ascending_labeled':    (p) => <ScalePathDiagram scale={C_MAJOR_NOTES} showFormula {...p} />,
  'cmaj_full_walkthrough':     (p) => <ScalePathDiagram scale={C_MAJOR_NOTES} showFormula mode="walkthrough" {...p} />,
  'finger_map_numbered':       (p) => <FingerMapDiagram showNumbers {...p} />,
  'finger_map_with_keyboard':  (p) => <><FingerMapDiagram showNumbers /><KeyboardDiagram highlightKeys={['C','D','E','F','G']} showNumbers mode="fingers" {...p} /></>,
  'finger_map_ghost_overlay':  (p) => <FingerMapDiagram showGhost showNumbers {...p} />,
  'finger_map_slowmo':         (p) => <FingerMapDiagram showGhost showNumbers mode="slowmo" {...p} />,
}

export const VISUAL_LABELS = {
  'numbered_keyboard': 'Piano Keyboard',
  'keyboard_middle_c': 'Finding Middle C',
  'keyboard_middle_c_arrow': 'Middle C Location',
  'half_step_demo': 'Half Step',
  'half_step_animated_arrows': 'Half Step Movement',
  'whole_step_demo': 'Whole Step',
  'scale_pattern_overlay': 'Major Scale Pattern',
  'cmaj_ascending_labeled': 'C Major Scale',
  'cmaj_full_walkthrough': 'C Major Walkthrough',
  'finger_map_numbered': 'Finger Numbers',
  'finger_map_with_keyboard': 'Fingers on Keys',
  'finger_map_ghost_overlay': 'Hand Position',
  'finger_map_slowmo': 'Hand Position Guide',
  'KeyboardDiagram': 'Piano Keyboard',
  'FingerMapDiagram': 'Finger Map',
  'ScalePathDiagram': 'Scale Path',
  'GenericVisual': 'Teaching Visual',
}

// ═══════════════════════════════════════════════════════════════
// VISUAL OVERLAY — Container component
// ═══════════════════════════════════════════════════════════════

export function VisualOverlay({ visual, activeTones }) {
  if (!visual) return null

  const assetId = visual.component || visual.asset || visual.visualAsset || null
  const props = visual.props || {}
  const label = VISUAL_LABELS[assetId] || assetId || 'Teaching Visual'
  const renderer = VISUAL_COMPONENT_MAP[assetId]

  return (
    <div className="wyl-visual-overlay">
      <div className="wyl-visual-card">
        <div className="wyl-visual-card__title">{label}</div>
        <div className="wyl-visual-card__component" style={{ padding: 16, flexDirection: 'column', gap: 12 }}>
          {renderer ? (
            renderer({ ...props, activeNote: activeTones?.[0] })
          ) : (
            <KeyboardDiagram
              highlightKeys={props.highlightKeys || C_MAJOR_NOTES}
              showNumbers={props.showNumbers}
              mode={props.mode || 'default'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
