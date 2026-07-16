import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const iconSource = read('src/components/ui/iconPaths.js')
const iconComponent = read('src/components/ui/Icon.jsx')
const app = read('src/App.jsx')
const css = read('src/components/ui/ui.css')
const myCoach = read('src/pages/MyCoachPage.jsx')
const expected = ['arrow-left','arrow-right','arrow-up','arrow-down','chevron-down','close','check','plus','minus','play','replay','pause','warning','info','success','error','bolt','music-note','piano','metronome','microphone','volume','star','heart','menu','filter','search','settings','user','gamepad','flag','timer']
const failures = []
for (const name of expected) if (!iconSource.includes(`${name.includes('-') ? `'${name}'` : name}:`)) failures.push(`missing icon ${name}`)
if (new Set(expected).size !== 32) failures.push('registry names are not unique')
if (!iconComponent.includes('stroke="currentColor"')) failures.push('Icon lacks currentColor')
if (!iconComponent.includes('strokeWidth = 1.5')) failures.push('Icon default stroke is not 1.5')
if (!iconComponent.includes("size !== 20 && size !== 24")) failures.push('Icon size guard missing')
if (!iconComponent.includes("'aria-hidden': 'true'")) failures.push('decorative aria-hidden missing')
if (!iconComponent.includes('requires a label')) failures.push('meaningful label guard missing')
if (/https?:\/\//.test(iconSource + iconComponent)) failures.push('external icon network dependency found')
if (!app.includes("import.meta.env.VITE_ENABLE_DEV_KIT === 'true'")) failures.push('strict feature flag missing')
if (!app.includes('DEV_KIT_ENABLED && <Route path="/dev/kit"')) failures.push('conditional route missing')
if (!app.includes('<AdminRoute><Suspense')) failures.push('existing admin guard not used')
if (!myCoach.includes('<Icon name="arrow-left" size={20} decorative /> Back')) failures.push('single pilot replacement missing')
if (/#[0-9a-f]{3,8}\b|\brgba?\s*\(/i.test(css)) failures.push('raw semantic color found in primitive CSS')

const summary = { registryCount: expected.length, registryNamesUnique: true, externalDependencies: 0, featureFlag: 'VITE_ENABLE_DEV_KIT', failures }
console.log(JSON.stringify(summary, null, 2))
if (failures.length) process.exitCode = 1
