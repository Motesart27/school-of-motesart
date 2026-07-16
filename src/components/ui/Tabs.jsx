import { useId, useRef, useState } from 'react'

export default function Tabs({ items, value, defaultValue, onChange, activation = 'automatic', label = 'Content sections' }) {
  const baseId = useId()
  const firstEnabled = items.find(item => !item.disabled)?.id
  const [internalValue, setInternalValue] = useState(defaultValue || firstEnabled)
  const selected = value ?? internalValue
  const refs = useRef(new Map())

  const select = id => {
    if (value === undefined) setInternalValue(id)
    onChange?.(id)
  }
  const enabled = items.filter(item => !item.disabled)
  const move = (currentId, direction, event) => {
    const current = enabled.findIndex(item => item.id === currentId)
    let next = current
    if (direction === 'first') next = 0
    else if (direction === 'last') next = enabled.length - 1
    else next = (current + direction + enabled.length) % enabled.length
    const nextId = enabled[next]?.id
    refs.current.get(nextId)?.focus()
    if (activation === 'automatic') select(nextId)
    event.preventDefault()
  }

  return (
    <div className="som-tabs">
      <div role="tablist" aria-label={label} aria-orientation="horizontal" className="som-tabs__list">
        {items.map(item => (
          <button
            key={item.id}
            ref={node => refs.current.set(item.id, node)}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-controls={`${baseId}-panel-${item.id}`}
            aria-selected={selected === item.id}
            tabIndex={selected === item.id ? 0 : -1}
            disabled={item.disabled}
            onClick={() => select(item.id)}
            onKeyDown={event => {
              if (event.key === 'ArrowRight') move(item.id, 1, event)
              if (event.key === 'ArrowLeft') move(item.id, -1, event)
              if (event.key === 'Home') move(item.id, 'first', event)
              if (event.key === 'End') move(item.id, 'last', event)
              if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) { select(item.id); event.preventDefault() }
            }}
          >{item.label}</button>
        ))}
      </div>
      {items.map(item => (
        <div key={item.id} role="tabpanel" id={`${baseId}-panel-${item.id}`} aria-labelledby={`${baseId}-tab-${item.id}`} hidden={selected !== item.id} tabIndex={0} className="som-tabs__panel">
          {item.content}
        </div>
      ))}
    </div>
  )
}
