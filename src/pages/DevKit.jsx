import { useMemo, useRef, useState } from 'react'
import {
  Button, Card, Drawer, EmptyState, ErrorState, FilterChips, Icon, Input, Modal,
  Select, Skeleton, StatusPill, Tabs, ToastProvider, Tooltip, iconNames,
  statusDictionaries, useToast,
} from '../components/ui/index.js'
import './DevKit.css'

const sampleLabel = <span className="dev-kit__sample">Sample data</span>

function IconsControls() {
  return (
    <section id="icons-controls" className="dev-kit__section" aria-labelledby="icons-controls-title">
      <header><div><p className="dev-kit__eyebrow">Foundations</p><h2 id="icons-controls-title">Icons and controls</h2></div>{sampleLabel}</header>
      <div className="dev-kit__icon-grid">
        {iconNames.map(name => <div key={name}><span><Icon name={name} size={20} decorative /><Icon name={name} size={24} decorative /></span><code>{name}</code></div>)}
      </div>
      <div className="dev-kit__stack">
        <h3>Buttons</h3>
        <div className="dev-kit__row">
          <Button leadingIcon="play">Start practice</Button>
          <Button variant="secondary">Review plan</Button>
          <Button variant="quiet">Not now</Button>
          <Button variant="danger">Remove staff draft</Button>
          <Button iconOnly aria-label="Open settings"><Icon name="settings" size={20} decorative /></Button>
          <Button loading>Saving plan</Button>
          <Button disabled>Unavailable</Button>
        </div>
      </div>
      <Card variant="raised"><h3>Accessibility notes</h3><p>Icons supplement visible words and never carry status alone. Every control is keyboard reachable with a 44-pixel minimum target.</p></Card>
    </section>
  )
}

function StatesForms() {
  const [filters, setFilters] = useState(['today'])
  const tabs = useMemo(() => [
    { id: 'warmup', label: 'Warm-up', content: <p>Choose a gentle starting activity.</p> },
    { id: 'practice', label: 'Practice', content: <p>Build a focused practice block.</p> },
    { id: 'reflection', label: 'Reflection', content: <p>Write one thing that felt stronger.</p> },
    { id: 'later', label: 'Later', content: <p>Unavailable in this sample.</p>, disabled: true },
  ], [])
  return (
    <section id="states-forms" className="dev-kit__section" aria-labelledby="states-forms-title">
      <header><div><p className="dev-kit__eyebrow">Accessible grammar</p><h2 id="states-forms-title">States and forms</h2></div>{sampleLabel}</header>
      <div className="dev-kit__cards">
        <Card><h3>Base card</h3><p>Quiet foundation for general content.</p></Card>
        <Card variant="raised"><h3>Raised card</h3><p>Separates a focused work area.</p></Card>
        <Card variant="elevated"><h3>Elevated card</h3><p>Reserved for temporary emphasis.</p></Card>
        <Card variant="interactive"><h3>Interactive content</h3><p><Button variant="secondary">Open activity</Button></p></Card>
        <Card variant="raised" selected><h3>Selected card</h3><p>Selection includes a border and visible text.</p></Card>
        <Card variant="raised" loading><Skeleton label="Loading sample activity" /></Card>
        <Card variant="raised" state="empty"><EmptyState title="Nothing scheduled" explanation="Choose an activity when you are ready." actionLabel="Browse activities" /></Card>
        <Card state="error"><ErrorState title="Couldn’t load this sample" explanation="The rest of the kit remains available." onRetry={() => {}} /></Card>
      </div>
      <div className="dev-kit__status-groups">
        {Object.entries(statusDictionaries).map(([audience, labels]) => <div key={audience}><h3>{audience === 'staff' ? 'Staff / operations' : `${audience[0].toUpperCase()}${audience.slice(1)}`}</h3><div className="dev-kit__row">{labels.map(label => <StatusPill key={label} audience={audience} label={label} icon={label === 'Urgent' ? 'warning' : undefined} />)}</div></div>)}
      </div>
      <div className="dev-kit__form-grid">
        <Input label="Practice note" helpText="Use a short, encouraging description." placeholder="Add a note" />
        <Input label="Read-only goal" value="Build a steady rhythm" readOnly />
        <Input label="Required field" error="Add a title before continuing." required />
        <Select label="Instrument" defaultValue="piano"><option value="piano">Piano</option><option value="voice">Voice</option></Select>
        <Select label="Disabled selection" disabled><option>Not available</option></Select>
      </div>
      <Tabs items={tabs} activation="automatic" />
      <FilterChips selected={filters} onChange={setFilters} options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'favorites', label: 'Favorites' }, { value: 'archived', label: 'Archived', disabled: true }]} />
    </section>
  )
}

function OverlayDemo() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const firstModalAction = useRef(null)
  const { notify } = useToast()
  return (
    <section id="overlays-feedback" className="dev-kit__section" aria-labelledby="overlays-feedback-title">
      <header><div><p className="dev-kit__eyebrow">Layered feedback</p><h2 id="overlays-feedback-title">Overlays and feedback</h2></div>{sampleLabel}</header>
      <Card variant="raised"><h3>Tooltip</h3><p>Helpful context remains available to pointer, keyboard, and touch users.</p><Tooltip content="This explanation is supplementary."><Button variant="secondary" leadingIcon="info">More context</Button></Tooltip></Card>
      <div className="dev-kit__row">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
        <Button variant="quiet" onClick={() => notify({ title: 'Plan saved', message: 'This is a polite sample notification.', tone: 'success' })}>Show polite toast</Button>
        <Button variant="quiet" onClick={() => notify({ title: 'Action needed', message: 'This urgent sample is assertive.', tone: 'error', urgent: true })}>Show urgent toast</Button>
      </div>
      <div className="dev-kit__motion"><Icon name="music-note" size={24} decorative /><div><h3>Reduced motion</h3><p>Overlays use a short opacity change with no transform travel; skeleton shimmer is removed.</p></div></div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Review sample plan" description="Focus is trapped here and restored when closed." initialFocusRef={firstModalAction}>
        <p>No live data is shown.</p><div className="dev-kit__row"><Button ref={firstModalAction} onClick={() => setModalOpen(false)}>Confirm</Button><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button></div>
      </Modal>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Sample details" description="The close control remains reachable on mobile."><p>Drawer content stays independent of application data.</p><Button onClick={() => setDrawerOpen(false)}>Done</Button></Drawer>
    </section>
  )
}

function DevKitContent() {
  const section = new URLSearchParams(window.location.search).get('section')
  return (
    <main className="dev-kit">
      <header className="dev-kit__hero"><div><p className="dev-kit__eyebrow">Admin-only · feature flagged</p><h1>Phase 1C Component Foundations</h1><p>Implemented primitives and accessibility states. All examples are synthetic.</p></div>{sampleLabel}</header>
      {(!section || section === 'icons-controls') && <IconsControls />}
      {(!section || section === 'states-forms') && <StatesForms />}
      {(!section || section === 'overlays-feedback') && <OverlayDemo />}
    </main>
  )
}

export default function DevKit() {
  return <ToastProvider><DevKitContent /></ToastProvider>
}
