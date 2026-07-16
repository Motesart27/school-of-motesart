import Icon from './Icon.jsx'

export default function FilterChips({ options, selected = [], onChange, label = 'Filters', multiple = true }) {
  const toggle = value => {
    const active = selected.includes(value)
    const next = multiple ? (active ? selected.filter(item => item !== value) : [...selected, value]) : [value]
    onChange?.(next)
  }
  return (
    <div className="som-filter-chips" role="group" aria-label={label}>
      {options.map(option => {
        const active = selected.includes(option.value)
        return (
          <button key={option.value} type="button" aria-pressed={active} disabled={option.disabled} onClick={() => toggle(option.value)}>
            {active && <Icon name="check" size={20} decorative />}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
