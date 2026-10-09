export default function initDashboardFilters (root = document) {
  root.querySelectorAll('[data-dashboard-filters]').forEach((panel, index) => {
    if (panel.querySelector('.app-dashboard-filters__toggle')) return
    const heading = panel.querySelector('.moj-filter__header h2')
    const content = panel.querySelector('.moj-filter__content')
    const options = content.querySelector('.moj-filter__options')
    options.append(options.querySelector('.govuk-button'))
    options.append(options.querySelector('[data-clear-filters]').parentElement)
    const button = root.createElement('button')
    button.type = 'button'
    button.className = 'app-dashboard-filters__toggle'
    button.textContent = heading.textContent
    content.id = `dashboard-filter-content-${index}`
    button.setAttribute('aria-controls', content.id)
    content.hidden = root.defaultView.matchMedia?.('(max-width: 40.0525em)').matches ?? false
    button.setAttribute('aria-expanded', String(!content.hidden))
    button.addEventListener('click', () => {
      content.hidden = !content.hidden
      button.setAttribute('aria-expanded', String(!content.hidden))
    })
    heading.replaceChildren(button)
    panel.classList.add('app-dashboard-filters--enhanced')
  })
}
