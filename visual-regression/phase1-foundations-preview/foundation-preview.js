(() => {
  const allowed = new Set(['tokens-type', 'component-states', 'icons-chart-overlays'])
  const board = new URLSearchParams(location.search).get('board') || 'tokens-type'
  const selected = allowed.has(board) ? board : 'tokens-type'
  document.querySelectorAll('[data-board]').forEach(node => {
    const active = node.dataset.board === selected
    node.classList.toggle('active', active)
    node.hidden = !active
  })
  document.documentElement.dataset.previewBoard = selected
  document.documentElement.dataset.productBehavior = 'not-implemented'

  const tabs = [...document.querySelectorAll('[role="tab"]:not(:disabled)')]
  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      let next = index
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = tabs.length - 1
      tabs[next].focus()
    })
  })

  window.__SOM_FOUNDATION_PREVIEW__ = {
    board: selected,
    strategy: 'SOM_FRONTEND_REDESIGN_STRATEGY_v1.1.1',
    standalone: true,
    implementedProductBehavior: false
  }
})()
