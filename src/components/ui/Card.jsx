export default function Card({ variant = 'base', state, selected = false, loading = false, children, className = '', ...props }) {
  const contentState = loading ? 'loading' : state
  return (
    <article
      {...props}
      className={`som-card som-card--${variant}${contentState ? ` som-card--${contentState}` : ''}${selected ? ' som-card--selected' : ''} ${className}`.trim()}
      aria-busy={loading || undefined}
      data-state={contentState || undefined}
    >
      {children}
    </article>
  )
}
