import { useId } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import useDialogFocus from './useDialogFocus.js'

export default function Modal({ open, onClose, title, description, children, initialFocusRef, dismissible = true }) {
  const titleId = useId()
  const descriptionId = useId()
  const containerRef = useDialogFocus({ open, onClose, initialFocusRef, dismissible })
  if (!open) return null
  return (
    <div className="som-overlay" onMouseDown={event => { if (dismissible && event.target === event.currentTarget) onClose?.() }}>
      <section ref={containerRef} className="som-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
        <header><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>{dismissible && <Button variant="quiet" iconOnly aria-label="Close dialog" onClick={onClose}><Icon name="close" size={20} decorative /></Button>}</header>
        <div className="som-dialog__body">{children}</div>
      </section>
    </div>
  )
}
