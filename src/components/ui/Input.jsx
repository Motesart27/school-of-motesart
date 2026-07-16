import { useId } from 'react'

export default function Input({ label, helpText, error, id, required = false, className = '', ...props }) {
  const generatedId = useId()
  const inputId = id || `som-input-${generatedId}`
  const helpId = helpText ? `${inputId}-help` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [helpId, errorId, props['aria-describedby']].filter(Boolean).join(' ') || undefined
  return (
    <div className={`som-field ${className}`.trim()}>
      <label htmlFor={inputId}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <input {...props} id={inputId} required={required} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} />
      {helpText && <p id={helpId} className="som-field__help">{helpText}</p>}
      {error && <p id={errorId} className="som-field__error"><span aria-hidden="true">!</span> {error}</p>}
    </div>
  )
}
