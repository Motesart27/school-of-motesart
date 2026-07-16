const line = d => ({ tag: 'path', props: { d } })
const circle = (cx, cy, r) => ({ tag: 'circle', props: { cx, cy, r } })
const rect = (x, y, width, height, rx) => ({ tag: 'rect', props: { x, y, width, height, rx } })
const polyline = points => ({ tag: 'polyline', props: { points } })
const polygon = points => ({ tag: 'polygon', props: { points } })

export const iconPaths = Object.freeze({
  'arrow-left': [line('M19 12H5'), polyline('11 18 5 12 11 6')],
  'arrow-right': [line('M5 12h14'), polyline('13 6 19 12 13 18')],
  'arrow-up': [line('M12 19V5'), polyline('6 11 12 5 18 11')],
  'arrow-down': [line('M12 5v14'), polyline('18 13 12 19 6 13')],
  'chevron-down': [polyline('6 9 12 15 18 9')],
  close: [line('M6 6l12 12'), line('M18 6 6 18')],
  check: [polyline('5 12 10 17 19 7')],
  plus: [line('M12 5v14'), line('M5 12h14')],
  minus: [line('M5 12h14')],
  play: [polygon('8 5 19 12 8 19')],
  replay: [polyline('4 9 4 4 9 4'), line('M4.5 9A8 8 0 1 1 6 18')],
  pause: [line('M9 6v12'), line('M15 6v12')],
  warning: [polygon('12 3 22 20 2 20'), line('M12 9v4'), line('M12 17h.01')],
  info: [circle(12, 12, 9), line('M12 11v6'), line('M12 7h.01')],
  success: [circle(12, 12, 9), polyline('8 12 11 15 17 9')],
  error: [circle(12, 12, 9), line('M9 9l6 6'), line('M15 9l-6 6')],
  bolt: [polygon('13 2 5 13 11 13 10 22 19 10 13 10')],
  'music-note': [line('M9 18V5l9-2v13'), circle(6, 18, 3), circle(15, 16, 3)],
  piano: [rect(3, 5, 18, 14, 2), line('M7 5v9'), line('M11 5v9'), line('M15 5v9'), line('M19 5v9'), line('M3 14h18')],
  metronome: [polygon('8 3 16 3 20 21 4 21'), line('M12 6l4 10'), line('M8 17h8')],
  microphone: [rect(9, 3, 6, 12, 3), line('M5 11a7 7 0 0 0 14 0'), line('M12 18v3'), line('M8 21h8')],
  volume: [polygon('4 10 8 10 13 6 13 18 8 14 4 14'), line('M16 9a4 4 0 0 1 0 6'), line('M18.5 6.5a8 8 0 0 1 0 11')],
  star: [polygon('12 3 14.8 8.7 21 9.6 16.5 14 17.6 20.2 12 17.3 6.4 20.2 7.5 14 3 9.6 9.2 8.7')],
  heart: [line('M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z')],
  menu: [line('M4 7h16'), line('M4 12h16'), line('M4 17h16')],
  filter: [line('M4 6h16'), line('M7 12h10'), line('M10 18h4')],
  search: [circle(10.5, 10.5, 6.5), line('M16 16l5 5')],
  settings: [circle(12, 12, 3), line('M12 2v3'), line('M12 19v3'), line('M2 12h3'), line('M19 12h3'), line('M4.9 4.9 7 7'), line('M17 17l2.1 2.1'), line('M19.1 4.9 17 7'), line('M7 17l-2.1 2.1')],
  user: [circle(12, 8, 4), line('M4 21a8 8 0 0 1 16 0')],
  gamepad: [rect(3, 8, 18, 10, 5), line('M8 11v4'), line('M6 13h4'), circle(16, 12, .6), circle(18, 15, .6)],
  flag: [line('M5 21V4'), line('M5 5h12l-2 4 2 4H5')],
  timer: [circle(12, 13, 8), line('M12 13l3-3'), line('M9 2h6'), line('M12 2v3')],
})

export const iconNames = Object.freeze(Object.keys(iconPaths))
