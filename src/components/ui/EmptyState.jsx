import Button from './Button.jsx'
import Icon from './Icon.jsx'

export default function EmptyState({ icon = 'music-note', title, explanation, actionLabel, onAction }) {
  return (
    <div className="som-content-state">
      <Icon name={icon} size={24} decorative />
      <h3>{title}</h3>
      <p>{explanation}</p>
      {actionLabel && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
