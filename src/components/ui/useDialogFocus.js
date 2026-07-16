import { useEffect, useRef } from 'react'

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function useDialogFocus({ open, onClose, initialFocusRef, dismissible = true }) {
  const containerRef = useRef(null)
  const invokerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    invokerRef.current = document.activeElement
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const container = containerRef.current
    const focusables = () => Array.from(container?.querySelectorAll(focusableSelector) || [])
    ;(initialFocusRef?.current || focusables()[0] || container)?.focus()

    const onKeyDown = event => {
      if (event.key === 'Escape' && dismissible) { event.preventDefault(); onClose?.() }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      if (!nodes.length) { event.preventDefault(); container?.focus(); return }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = priorOverflow
      invokerRef.current?.focus?.()
    }
  }, [dismissible, initialFocusRef, onClose, open])

  return containerRef
}
