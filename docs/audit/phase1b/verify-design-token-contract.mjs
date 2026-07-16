import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cssVariables, installDesignTokens, tokens } from '../../../src/styles/tokens.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')
const contract = JSON.parse(await fs.readFile(path.join(root, 'docs/audit/phase1-preview/token-contract.json'), 'utf8'))
const indexHTML = await fs.readFile(path.join(root, 'index.html'), 'utf8')
const expectedFamilies = ['surface', 'border', 'text', 'accent', 'status', 'role', 'dpm', 'chart', 'radius', 'space', 'type', 'motion']

assert.deepEqual(Object.keys(tokens), expectedFamilies, 'production token families must match the approved order exactly')
assert.deepEqual(Object.keys(contract), expectedFamilies, 'contract JSON must contain exactly the approved families')

const contractValues = value => {
  if (Array.isArray(value)) return value.map(contractValues)
  if (!value || typeof value !== 'object') return value
  if (Object.hasOwn(value, 'value')) return value.documentationOnly ? undefined : contractValues(value.value)
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, contractValues(child)]).filter(([, child]) => child !== undefined))
}

const expectedTokens = Object.fromEntries(expectedFamilies.map(family => [family, contractValues(contract[family])]))
assert.deepEqual(tokens, expectedTokens, 'production tokens must equal all runtime-approved contract values')
assert.equal(tokens.role.ambassadorGold, '#D6A84B')
assert.equal(tokens.text.muted, 'rgba(244,246,251,0.48)')
assert.ok(!Object.hasOwn(tokens.motion, 'celebrationSpring'), 'approximate spring guidance cannot be executable')

const hasNull = value => value === null || (value && typeof value === 'object' && Object.values(value).some(hasNull))
assert.equal(hasNull(tokens), false, 'production tokens cannot contain unresolved nulls')

const variableNames = Object.keys(cssVariables)
assert.equal(new Set(variableNames).size, variableNames.length, 'CSS custom-property names must be unique')
assert.ok(variableNames.every(name => name.startsWith('--som-')), 'all CSS variables must use the SOM namespace')
assert.ok(!variableNames.some(name => /spring/i.test(name)), 'spring approximations cannot become CSS variables')

const installed = new Map()
const fakeRoot = { style: { setProperty: (name, value) => installed.set(name, value) } }
assert.equal(installDesignTokens(fakeRoot), fakeRoot)
assert.equal(installed.size, variableNames.length)
Object.entries(cssVariables).forEach(([name, value]) => assert.equal(installed.get(name), String(value)))

const parseHex = hex => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16))
const linear = channel => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
const luminance = rgb => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2])
const blend = (foreground, background, alpha) => foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha))
const contrast = (left, right) => (Math.max(luminance(left), luminance(right)) + 0.05) / (Math.min(luminance(left), luminance(right)) + 0.05)
const mutedContrast = contrast(blend(parseHex('#F4F6FB'), parseHex('#111527'), 0.48), parseHex('#111527'))
assert.ok(mutedContrast >= 4.5, `muted contrast must be at least 4.5:1, received ${mutedContrast}`)

const fontStylesheets = [...indexHTML.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/g)].map(match => match[1])
assert.equal(fontStylesheets.length, 1, 'index.html must have one canonical Google Fonts stylesheet')
const canonicalFontURL = fontStylesheets[0]
assert.match(canonicalFontURL, /family=DM\+Sans:wght@400;500;700/)
assert.match(canonicalFontURL, /family=Outfit:wght@500;600;700/)
assert.match(canonicalFontURL, /display=swap/)
assert.doesNotMatch(canonicalFontURL, /Syne/i)

const result = {
  requiredFamilies: expectedFamilies.length,
  productionFamilies: Object.keys(tokens).length,
  cssVariableCount: variableNames.length,
  installedVariableCount: installed.size,
  ambassadorGold: tokens.role.ambassadorGold,
  mutedText: tokens.text.muted,
  mutedContrastOnRaised: Number(mutedContrast.toFixed(4)),
  productionSpringApproximation: false,
  unresolvedNull: false,
  canonicalFontStylesheetCount: fontStylesheets.length,
  canonicalFamilies: ['DM Sans', 'Outfit'],
  syneInCanonicalLoader: false,
  contractParity: true,
}

console.log(JSON.stringify(result, null, 2))
