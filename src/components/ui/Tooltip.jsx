import { cloneElement, useId, useState } from 'react'

export default function Tooltip({ content, children }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const child = cloneElement(children, {
    'aria-describedby': open ? id : undefined,
    onFocus: event => { children.props.onFocus?.(event); setOpen(true) },
    onBlur: event => { children.props.onBlur?.(event); setOpen(false) },
    onMouseEnter: event => { children.props.onMouseEnter?.(event); setOpen(true) },
    onMouseLeave: event => { children.props.onMouseLeave?.(event); setOpen(false) },
    onClick: event => { children.props.onClick?.(event); setOpen(value => !value) },
    onKeyDown: event => {
      children.props.onKeyDown?.(event)
      if (event.key === 'Escape') { setOpen(false); event.stopPropagation() }
    },
  })
  return <span className="som-tooltip-anchor">{child}{open && <span id={id} role="tooltip" className="som-tooltip">{content}</span>}</span>
}
