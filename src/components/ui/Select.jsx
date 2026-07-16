import { useId } from 'react'

export default function Select({ label, helpText, error, id, required = false, children, className = '', ...props }) {
  const generatedId = useId()
  const selectId = id || `som-select-${generatedId}`
  const helpId = helpText ? `${selectId}-help` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const describedBy = [helpId, errorId, props['aria-describedby']].filter(Boolean).join(' ') || undefined
  return (
    <div className={`som-field ${className}`.trim()}>
      <label htmlFor={selectId}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <select {...props} id={selectId} required={required} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy}>{children}</select>
      {helpText && <p id={helpId} className="som-field__help">{helpText}</p>}
      {error && <p id={errorId} className="som-field__error"><span aria-hidden="true">!</span> {error}</p>}
    </div>
  )
}
