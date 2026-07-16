import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'

const ToastContext = createContext(null)

function ToastItem({ toast, onDismiss }) {
  const timer = useRef(null)
  const remaining = useRef(toast.duration)
  const started = useRef(Date.now())
  const start = useCallback(() => {
    if (!toast.duration) return
    started.current = Date.now()
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current)
  }, [onDismiss, toast.duration, toast.id])
  const pause = () => {
    clearTimeout(timer.current)
    remaining.current = Math.max(0, remaining.current - (Date.now() - started.current))
  }
  useEffect(() => { start(); return () => clearTimeout(timer.current) }, [start])
  return (
    <div className={`som-toast som-toast--${toast.tone}`} onMouseEnter={pause} onMouseLeave={start} onFocus={pause} onBlur={start}>
      <Icon name={toast.tone === 'error' ? 'error' : toast.tone === 'success' ? 'success' : 'info'} size={20} decorative />
      <div><strong>{toast.title}</strong>{toast.message && <p>{toast.message}</p>}</div>
      <Button variant="quiet" iconOnly aria-label={`Dismiss ${toast.title}`} onClick={() => onDismiss(toast.id)}><Icon name="close" size={20} decorative /></Button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback(id => setToasts(items => items.filter(item => item.id !== id)), [])
  const notify = useCallback(({ title, message, tone = 'info', urgent = false, duration = 5000 }) => {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    setToasts(items => [...items, { id, title, message, tone, urgent, duration }])
    return id
  }, [])
  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="som-toast-stack" aria-label="Notifications">
        <div role="status" aria-live="polite" aria-atomic="false">{toasts.filter(item => !item.urgent).map(item => <ToastItem key={item.id} toast={item} onDismiss={dismiss} />)}</div>
        <div role="alert" aria-live="assertive" aria-atomic="false">{toasts.filter(item => item.urgent).map(item => <ToastItem key={item.id} toast={item} onDismiss={dismiss} />)}</div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}
