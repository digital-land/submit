import nunjucks from 'nunjucks'
import { JSDOM } from 'jsdom'
import { expect, describe, it } from 'vitest'
import addFilters from '../../../../src/filters/filters'
import { makeDatasetSlugToReadableNameFilter } from '../../../../src/filters/makeDatasetSlugToReadableNameFilter.js'

// Configure Nunjucks
const nunjucksEnv = nunjucks.configure([
  'src/views',
  'src/views/check',
  'src/views/submit',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  dev: true,
  noCache: true,
  watch: true
})

addFilters(nunjucksEnv, { dataSubjects: {} })
nunjucksEnv.addFilter('datasetSlugToReadableName', makeDatasetSlugToReadableNameFilter(new Map([
  ['local-plan', 'Local plan'],
  ['minerals-plan', 'Minerals plan'],
  ['waste-plan', 'Waste plan'],
  ['supplementary-plan', 'Supplementary plan']
])))

const resultsTemplatePath = 'results/results.html'

describe('results.html', () => {
  describe('task lists', () => {
    it('should show passed checks when they exist', async () => {
      const passedCheck = {
        title: {
          text: 'check1'
        },
        href: '',
        status: {
          tag: {
            text: 'Passed',
            classes: 'govuk-tag--green'
          }
        }
      }
      const params = { options: { passedChecks: [passedCheck] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      const passedChecks = dom.window.document.getElementById('passed-checks')
      expect(passedChecks).not.toBeNull()
      expect(passedChecks.innerHTML).to.include('check1')
    })

    it('should not show passed checks when none exist', async () => {
      const params = { options: { passedChecks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.getElementById('passed-checks')).toBeNull()
    })

    it('should show blocking tasks when they exist', async () => {
      const task = {
        title: {
          text: 'task1'
        },
        href: '',
        status: {
          tag: {
            text: 'Must fix',
            classes: 'govuk-tag--red'
          }
        }
      }
      const params = { options: { tasksBlocking: [task] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      const blockingTasksElement = dom.window.document.getElementById('required-checks')
      expect(blockingTasksElement).not.toBeNull()
      expect(blockingTasksElement.innerHTML).to.include('task1')
    })

    it('should not show blocking tasks when none exist', async () => {
      const params = { options: { blockingTasks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.getElementById('required-checks')).toBeNull()
    })

    it('should show non-blocking tasks when they exist', async () => {
      const nonBlockingTask = {
        title: {
          text: 'task1'
        },
        href: '',
        status: {
          tag: {
            text: 'Needs improving',
            classes: 'govuk-tag--yellow'
          }
        }
      }

      const params = { options: { tasksNonBlocking: [nonBlockingTask] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      const nonBlockingTasksEl = dom.window.document.getElementById('optional-checks')

      expect(nonBlockingTasksEl).not.toBeNull()
      expect(nonBlockingTasksEl.innerHTML).to.include('task1')
    })

    it('should not show non-blocking tasks when none exist', async () => {
      const params = { options: { nonBlockingTasks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.getElementById('optional-checks')).toBeNull()
    })
  })

  describe('buttons', () => {
    it('should show upload button when blocking tasks exist', async () => {
      const params = { options: { tasksBlocking: ['task1'] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html, {
        url: 'http://example.com', // use a valid URL to avoid opaque origin error
        runScripts: 'dangerously' // only do this if you trust the scripts you're running
      })
      expect(dom.window.document.querySelector('a[href="/check/upload-method"]')).not.toBeNull()
      expect(dom.window.document.querySelector('button[type="submit"].govuk-button')).toBeNull()
    })

    it('should show continue button and upload link when no blocking tasks exist', async () => {
      const params = { options: { tasksBlocking: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.querySelector('button[type="submit"].govuk-button')).not.toBeNull()
      expect(dom.window.document.querySelector('button[type="submit"].govuk-button')?.textContent).toContain('Continue')
    })
  })

  describe('dataset actions', () => {
    const conditionalFieldsGuidanceUrl = 'https://www.gov.uk/government/publications/publish-your-plan-data/publish-your-plan-data#:~:text=modified%20the%20data.-,Conditional%20fields,-Your%20plan%20data'

    it('shows conditional field guidance for local-plan results', async () => {
      const html = await nunjucksEnv.render(resultsTemplatePath, {
        options: { requestParams: { dataset: 'local-plan' } }
      })
      const document = new JSDOM(html).window.document
      const link = document.querySelector(`a[href="${conditionalFieldsGuidanceUrl}"]`)

      expect(link).not.toBeNull()
      expect(link.textContent.trim()).toBe('Check what conditional fields may apply to your plan dataset')
      expect(link.target).toBe('_blank')
      expect(link.rel).toBe('noopener noreferrer')
    })

    it('does not show conditional field guidance for other datasets', async () => {
      const html = await nunjucksEnv.render(resultsTemplatePath, {
        options: { requestParams: { dataset: 'conservation-area' } }
      })
      const document = new JSDOM(html).window.document

      expect(document.querySelector(`a[href="${conditionalFieldsGuidanceUrl}"]`)).toBeNull()
    })
  })

  describe('tabbing functionality', () => {
    it('should show both tabs when both have data', async () => {
      const params = {
        options: {
          geometries: ['geometry1'],
          tableParams: { rows: ['row1'] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      expect(mapTab).not.toBeNull()
      expect(tableTab).not.toBeNull()
    })

    it('should only show map tab when only geometries exist', async () => {
      const params = {
        options: {
          geometries: ['geometry1'],
          tableParams: { rows: [] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      expect(mapTab).not.toBeNull()
      expect(tableTab).toBeNull()
    })

    it('should only show table tab when only table data exists', async () => {
      const params = {
        options: {
          geometries: undefined,
          tableParams: { rows: ['row1'] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html, {
        url: 'http://example.com' // need this to avoid localStorage is not available for opaque origins
      })

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      expect(mapTab).toBeNull()
      expect(tableTab).not.toBeNull()
    })

    it('should default to map tab when both tabs are present', async () => {
      const params = {
        options: {
          geometries: ['geometry1'],
          tableParams: { rows: ['row1'] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      // Check if map tab is active by default
      expect(mapTab.classList.contains('govuk-tabs__panel--hidden')).to.equal(false)
      expect(tableTab.classList.contains('govuk-tabs__panel--hidden')).to.equal(true)
    })
  })
})

describe('plans in the checked resource', () => {
  const render = (template, options) => new JSDOM(nunjucksEnv.render(template, { options })).window.document
  const datasetsInResource = ['local-plan', 'minerals-plan']

  it.each([
    ['results/results.html', { requestParams: { dataset: 'minerals-plan' } }, 'We have detected more than one plan', 'the results are below'],
    ['check/confirmation.html', { dataset: 'minerals-plan', requestId: 'request-123' }, 'We detected multiple plans', 'You do not need to check and provide them separately.']
  ])('uses the uploaded dataset and correct message in %s', (template, options, opening, detail) => {
    const inset = render(template, { ...options, datasetsInResource }).querySelector('#multiple-plan-types.govuk-inset-text')
    expect(inset.textContent).toContain(`${opening} in your minerals plan data.`)
    expect(inset.textContent).toContain(detail)
  })

  it.each([undefined, [], ['local-plan']])('hides the inset for %j on both pages', datasetsInResource => {
    for (const template of ['results/results.html', 'check/confirmation.html']) {
      expect(render(template, { datasetsInResource }).querySelector('#multiple-plan-types')).toBeNull()
    }
  })

  it('keeps blocking tasks alongside the inset and prevents continuing', () => {
    const document = render(resultsTemplatePath, { datasetsInResource, tasksBlocking: [{ title: { text: 'Document-count column missing' }, status: { text: 'Must fix' } }] })
    expect(document.querySelector('#multiple-plan-types')).not.toBeNull()
    expect(document.querySelector('#required-checks').textContent).toContain('Document-count column missing')
    expect(document.querySelector('a.govuk-button').textContent.trim()).toBe('Check data')
    expect(document.querySelector('button[type="submit"]')).toBeNull()
  })

  it.each([undefined, 'request-123'])('preserves confirmation actions for request %j', requestId => {
    const document = render('check/confirmation.html', { datasetsInResource, requestId })
    const baseline = render('check/confirmation.html', { requestId })
    expect(document.querySelector('#multiple-plan-types')).not.toBeNull()
    expect(document.querySelector('.govuk-button-group')?.outerHTML).toBe(baseline.querySelector('.govuk-button-group')?.outerHTML)
    expect(document.querySelector('.submit-link')?.getAttribute('href')).toBe(requestId ? '/submit/lpa-details' : undefined)
  })

  it.each([
    [undefined, undefined], [[], undefined], [['local-plan'], 'Local plan'],
    [datasetsInResource, 'Local plan, Minerals plan'], [['waste-plan', 'supplementary-plan'], 'Waste plan, Supplementary plan']
  ])('shows the dataset names after Found for %j', (datasetsInResource, expected) => {
    const document = render(resultsTemplatePath, { datasetsInResource, totalRows: 3 })
    const rows = [...document.querySelectorAll('.govuk-summary-list__row')]
    const row = rows.find(row => row.querySelector('dt').textContent.trim() === 'Datasets')
    expect(row?.querySelector('dd').textContent.trim()).toBe(expected)
    if (row) {
      expect(row.previousElementSibling.querySelector('dt').textContent.trim()).toBe('Found')
      expect(row.previousElementSibling.querySelector('dd').textContent.trim()).toBe('3 rows')
    }
  })
})
