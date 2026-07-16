import Button from './Button.jsx'
import Icon from './Icon.jsx'

export default function ErrorState({ title, explanation, actionLabel = 'Try again', onRetry, technicalDetails, staffContext = false }) {
  return (
    <div className="som-content-state som-content-state--error" role="alert">
      <Icon name="error" size={24} decorative />
      <h3>{title}</h3>
      <p>{explanation}</p>
      {staffContext && technicalDetails && <details><summary>Technical details</summary><p>{technicalDetails}</p></details>}
      {onRetry && <Button variant="secondary" onClick={onRetry}>{actionLabel}</Button>}
    </div>
  )
}
