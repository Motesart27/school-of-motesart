import { createElement } from 'react'
import { iconPaths } from './iconPaths.js'

export default function Icon({ name, size = 24, className, label, strokeWidth = 1.5, decorative = true }) {
  const geometry = iconPaths[name]
  if (!geometry) {
    if (import.meta.env.DEV) throw new Error(`Unknown SOM icon: ${name}`)
    return null
  }
  if (size !== 20 && size !== 24) {
    if (import.meta.env.DEV) throw new Error(`SOM Icon size must be 20 or 24; received ${size}`)
    return null
  }
  if (!decorative && !label) {
    if (import.meta.env.DEV) throw new Error(`Meaningful SOM icon "${name}" requires a label`)
    return null
  }

  const accessibility = decorative
    ? { 'aria-hidden': 'true' }
    : { role: 'img', 'aria-label': label }

  return (
    <svg
      {...accessibility}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      data-som-icon={name}
    >
      {geometry.map(({ tag, props }, index) => createElement(tag, { ...props, key: `${name}-${index}` }))}
    </svg>
  )
}
