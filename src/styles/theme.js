// SOM Design System — Single Source of Truth
// Both Login.jsx and Registration.jsx import from this file
// Never hardcode these values in component files

export const COLORS = {
  // Backgrounds
  bgDeep:    '#0f0c29',
  bgMid:     '#302b63',
  bgDark:    '#24243e',
  cardBg:    'rgba(255,255,255,0.05)',
  cardBorder:'rgba(255,255,255,0.1)',

  // Primary brand — purple/pink (dominant)
  accent:    '#d946ef',
  purple:    '#a855f7',
  purpleDark:'#7c3aed',

  // Secondary — teal (progress, step indicators, continue CTA)
  teal:      '#4ecdc4',
  tealDark:  '#38b2ac',
  cyan:      '#06b6d4',

  // Role accents
  student:   '#14b8a6',
  teacher:   '#f59e0b',
  parent:    '#3b82f6',
  admin:     '#f97316',

  // Laser rings
  ring1Top:  '#d946ef',
  ring1Right:'#a855f7',
  ring2Bot:  '#06b6d4',
  ring2Left: '#7c3aed',

  // Text
  textPrimary:   '#ffffff',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted:     'rgba(255,255,255,0.3)',
  textHint:      'rgba(255,255,255,0.2)',

  // Semantic
  error:   '#f87171',
  success: '#4ade80',
}

export const FONTS = {
  display: "'Outfit', sans-serif",
  body:    "'DM Sans', sans-serif",
}

export const GRADIENTS = {
  page:    `linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)`,
  primary: `linear-gradient(135deg, #d946ef, #a855f7)`,
  teal:    `linear-gradient(135deg, #38b2ac, #4ecdc4)`,
}

export const ANIMATIONS = `
  @keyframes laserSpin {
    0%   { transform: translate(-50%,-50%) rotate(0deg); }
    100% { transform: translate(-50%,-50%) rotate(360deg); }
  }
  @keyframes glowPulse {
    0%,100% { opacity: 0.35; }
    50%     { opacity: 0.7; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

// Shared logo structure — use this in both Login and Registration
// Login: logoSize=140, ringSize1=158, ringSize2=170
// Registration: logoSize=64, ringSize1=76, ringSize2=84
export const logoStyles = (logoSize = 140, wrapSize = 180) => ({
  logoWrapper: {
    position: 'relative',
    width: wrapSize, height: wrapSize,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    width: wrapSize + 20, height: wrapSize + 20,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.32) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)',
    filter: 'blur(14px)',
    pointerEvents: 'none',
    animation: 'glowPulse 4s ease-in-out infinite',
    zIndex: 1,
  },
  laserRing1: {
    position: 'absolute', top: '50%', left: '50%',
    width: logoSize + 18, height: logoSize + 18,
    borderRadius: '50%',
    border: '2px solid transparent',
    borderTop: `2px solid ${COLORS.ring1Top}`,
    borderRight: `2px solid ${COLORS.ring1Right}`,
    animation: 'laserSpin 3s linear infinite',
    filter: 'drop-shadow(0 0 8px rgba(217,70,239,0.65))',
    zIndex: 5,
  },
  laserRing2: {
    position: 'absolute', top: '50%', left: '50%',
    width: logoSize + 30, height: logoSize + 30,
    borderRadius: '50%',
    border: '1.5px solid transparent',
    borderBottom: `1.5px solid ${COLORS.ring2Bot}`,
    borderLeft: `1.5px solid ${COLORS.ring2Left}`,
    animation: 'laserSpin 5s linear infinite reverse',
    filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.45))',
    opacity: 0.8,
    zIndex: 5,
  },
  logoCircle: {
    width: logoSize, height: logoSize,
    borderRadius: '50%',
    background: '#ffffff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative', zIndex: 10,
    boxShadow: '0 0 30px rgba(168,85,247,0.25)',
  },
  logoImg: {
    width: logoSize - 10, height: logoSize - 10,
    objectFit: 'contain',
    padding: 4,
  },
})

export const SHARED = {
  page: {
    minHeight: '100vh',
    background: GRADIENTS.page,
    fontFamily: FONTS.body,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '32px 16px 60px',
    position: 'relative', overflow: 'hidden',
  },
  card: {
    background: COLORS.cardBg,
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: `1px solid ${COLORS.cardBorder}`,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  btnPrimary: {
    background: GRADIENTS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 0',
    fontSize: 15, fontWeight: 700,
    fontFamily: FONTS.body,
    cursor: 'pointer',
    width: '100%',
  },
  btnSecondary: {
    background: COLORS.cardBg,
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 12,
    padding: '13px 0',
    fontSize: 14, fontWeight: 600,
    fontFamily: FONTS.body,
    cursor: 'pointer',
    flex: 1,
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 10,
    padding: '12px 14px',
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.body,
    outline: 'none',
    boxSizing: 'border-box',
  },
  logoTitle: {
    fontFamily: FONTS.display,
    fontSize: 26, fontWeight: 700,
    color: '#fff', margin: '0 0 4px',
    textAlign: 'center',
  },
  logoAccent: {
    color: COLORS.accent,
    textShadow: `0 0 20px rgba(217,70,239,0.45)`,
  },
  logoSub: {
    textAlign: 'center',
    fontSize: 11, letterSpacing: '0.18em',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    margin: '0 0 24px',
  },
  error: { color: COLORS.error, fontSize: 13, margin: 0, textAlign: 'center' },
  success: { color: COLORS.success, fontSize: 13, margin: 0, textAlign: 'center' },
}
