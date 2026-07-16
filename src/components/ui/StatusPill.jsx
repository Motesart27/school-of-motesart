import Icon from './Icon.jsx'

export const statusDictionaries = Object.freeze({
  student: Object.freeze(['Resting', 'Waking up', 'Rolling', 'On Fire', 'Let’s revisit', 'Getting there', 'Locked in', 'Growing', 'Building']),
  parent: Object.freeze(['Doing great', 'Finding rhythm', 'Could use a boost']),
  staff: Object.freeze(['On Track', 'Watch', 'Needs Follow-up', 'Urgent']),
})

const toneByLabel = {
  'On Fire': 'success', 'Locked in': 'success', Growing: 'success', 'Doing great': 'success', 'On Track': 'success',
  Rolling: 'info', Building: 'info', 'Finding rhythm': 'info', Resting: 'neutral',
  'Waking up': 'encourage', 'Let’s revisit': 'encourage', 'Getting there': 'encourage', 'Could use a boost': 'encourage', Watch: 'warning',
  'Needs Follow-up': 'warning', Urgent: 'danger',
}

export default function StatusPill({ audience = 'student', label, icon }) {
  const dictionary = statusDictionaries[audience]
  if (!dictionary || !dictionary.includes(label)) {
    throw new Error(`StatusPill label "${label}" is not approved for ${audience}`)
  }
  return (
    <span className={`som-status-pill som-status-pill--${toneByLabel[label] || 'neutral'}`} data-audience={audience}>
      {icon && <Icon name={icon} size={20} decorative />}
      <span>{label}</span>
    </span>
  )
}
