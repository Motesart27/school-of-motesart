import { forwardRef } from 'react'
import Icon from './Icon.jsx'

const Button = forwardRef(function Button({
  children,
  variant = 'primary',
  size = 'md',
  leadingIcon,
  iconOnly = false,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}, ref) {
  if (iconOnly && !props['aria-label']) {
    if (import.meta.env.DEV) throw new Error('Icon-only Button requires aria-label')
  }
  const isDisabled = disabled || loading
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`som-button som-button--${variant} som-button--${size}${iconOnly ? ' som-button--icon-only' : ''} ${className}`.trim()}
    >
      <span className="som-button__content">
        {loading ? <span className="som-button__spinner" aria-hidden="true" /> : leadingIcon ? <Icon name={leadingIcon} size={20} decorative /> : null}
        {!iconOnly && <span>{children}</span>}
        {iconOnly && !loading && children}
      </span>
      {loading && <span className="som-visually-hidden">Loading</span>}
    </button>
  )
})

export default Button
