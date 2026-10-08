import { describe, it, expect, vi } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from '../../generic-page.js'
import jsdom from 'jsdom'
import { makeDatasetSlugToReadableNameFilter } from '../../../../src/filters/makeDatasetSlugToReadableNameFilter.js'
import mocker from '../../../utils/mocker.js'
import { datasetStatusEnum, OrgOverviewPage } from '../../../../src/routes/schemas.js'
import { datasetSlugToReadableName } from '../../../../src/utils/datasetSlugToReadableName.js'
import initDashboardFilters from '../../../../src/assets/js/components/dashboard-filters.js'

const datasetNameMapping = new Map()
const nunjucks = setupNunjucks({ datasetNameMapping })

const seed = new Date().getTime()

/**
 * Verifies the number of rendered dataset cards for group designated by `key`
 * matches the number of datasets passed to the template.
 *
 * @param { Function } expect
 * @param {string} key
 * @param {{ slug: string }[]} datasets
 * @param {Document} document
 */
const datasetGroup = ({ expect }, key, datasets, document) => {
  const datasetCardBlock = document.querySelector(`ul[data-reason="${key}"]`)
  if (!datasetCardBlock) {
    throw new Error(`Dataset card block for "${key}" not found`)
  }
  const datasetCards = datasetCardBlock.children
  // const datasetCards = document.querySelectorAll(`ul[data-reason="${key}"] li`)
  expect(datasetCards.length).toEqual(datasets.length)
  const datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(datasetNameMapping)

  datasets.forEach((dataset, i) => {
    expect(datasetCards[i].querySelector('.govuk-heading-m').textContent.toLowerCase()).toContain(datasetSlugToReadableName(dataset.dataset).toLowerCase())
  })
}

describe(`LPA Overview Page (seed: ${seed})`, () => {
  const params = mocker(OrgOverviewPage, seed)
  delete params.filters
  delete params.filteredDatasets
  delete params.resultTotal
  console.debug(`mocked datasets: statutory = ${params.datasets.statutory?.length ?? 'none'}, expected = ${params.datasets.expected?.length ?? 'none'}, prospective = ${params.datasets.prospective?.length ?? 'none'}`)

  const html = nunjucks.render('organisations/overview.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  it('renders selected filters, filtered results and the unfiltered total', () => {
    const html = nunjucks.render('organisations/overview.html', {
      ...params,
      collections: [{ value: 'trees', text: 'Trees' }],
      filters: { status: ['live'], collection: ['trees'], requirement: ['statutory'] },
      filteredDatasets: { statutory: [{ dataset: 'tree', status: 'Live' }] },
      resultTotal: 4
    })
    const document = new jsdom.JSDOM(html).window.document
    expect(document.querySelector('form[data-dashboard-filters]').method).toBe('get')
    expect([...document.querySelectorAll('input:checked')].map(input => input.value)).toEqual(['live', 'trees', 'statutory'])
    expect(document.querySelectorAll('[data-dataset]')).toHaveLength(1)
    expect(document.querySelector('[data-testid="dataset-results-count"]').textContent).toBe('Showing 1 of 4 datasets')
    initDashboardFilters(document)
    expect(document.querySelector('.moj-filter__content').hidden).toBe(false)
    expect(document.querySelector('.app-dashboard-filters__toggle').getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.moj-filter__options').lastElementChild.textContent.trim()).toBe('Apply filters')
  })

  it.each([true, false])('sets the initial filter state for mobile: %s', mobile => {
    const { window } = new jsdom.JSDOM(html)
    window.matchMedia = vi.fn().mockReturnValue({ matches: mobile })
    const document = window.document
    const checkbox = document.querySelector('input[type="checkbox"]')
    checkbox.checked = true
    initDashboardFilters(document)
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 40.0525em)')
    const content = document.querySelector('.moj-filter__content')
    const button = document.querySelector('.app-dashboard-filters__toggle')
    expect(content.hidden).toBe(mobile)
    expect(button.getAttribute('aria-expanded')).toBe(String(!mobile))
    button.click()
    expect(content.hidden).toBe(!mobile)
    expect(checkbox.checked).toBe(true)
  })

  it('explains when no datasets match', () => {
    const html = nunjucks.render('organisations/overview.html', {
      ...params,
      filteredDatasets: { statutory: [], expected: [], prospective: [] },
      resultTotal: 4
    })
    const document = new jsdom.JSDOM(html).window.document
    expect(document.querySelector('[data-testid="dataset-results-count"]').textContent).toBe('Showing 0 of 4 datasets')
    expect(document.querySelectorAll('[data-dataset]')).toHaveLength(0)
    expect(document.body.textContent).toContain('No datasets match your filters.')
  })

  it('Uses the filter header to collapse all options while preserving selections', () => {
    const document = new jsdom.JSDOM(html).window.document
    const content = document.querySelector('.moj-filter__content')
    expect(content.hidden).toBe(false)

    initDashboardFilters(document)
    initDashboardFilters(document)
    const buttons = document.querySelectorAll('.app-dashboard-filters__toggle')
    expect(buttons).toHaveLength(1)
    const button = buttons[0]
    expect(button.closest('.moj-filter__header')).not.toBeNull()
    expect(button.getAttribute('aria-controls')).toBe(content.id)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(content.hidden).toBe(false)
    const checkbox = content.querySelector('input[type="checkbox"]')
    checkbox.checked = true
    button.click()
    expect(content.hidden).toBe(true)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.click()
    expect(content.hidden).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(checkbox.checked).toBe(true)
    expect(content.querySelector('details')).toBeNull()
  })

  runGenericPageTests(html, {
    pageTitle: `${params.organisation.name} overview - Check and provide planning data`,
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Organisations', href: '/organisations' }, { text: params.organisation.name }]
  })

  const statsBoxes = document.querySelector('.dataset-status').children
  it('Datasets provided gives the correct value', () => {
    expect(statsBoxes[0].textContent).toContain(`${params.datasetsWithEndpoints}/${params.totalDatasets}`)
    expect(statsBoxes[0].textContent).toContain('authoritative dataset')
    expect(statsBoxes[0].textContent).toContain('provided')
  })

  it('Datasets with errors gives the correct value', () => {
    expect(statsBoxes[1].textContent).toContain(params.datasetsWithErrors)
    expect(statsBoxes[1].textContent).toContain('accessing URLs')
  })

  it('Datasets with issues gives the correct value', () => {
    expect(statsBoxes[2].textContent).toContain(params.datasetsWithIssues)
    expect(statsBoxes[2].textContent).toContain('can be improved')
  })

  it('The correct number of dataset cards are rendered with the correct titles in group "statutory"', () => {
    if (params.datasets.statutory && params.datasets.statutory.length > 0) {
      datasetGroup({ expect }, 'statutory', params.datasets.statutory, document)
    }
  })

  it.skipIf(!params.datasets.expected || params.datasets.expected.length === 0 || !params.isODPMember)('The correct number of dataset cards are rendered with the correct titles in group "expected"', () => {
    datasetGroup({ expect }, 'expected', params.datasets.expected, document)
  })

  it.skipIf(!params.datasets.prospective || params.datasets.prospective.length === 0)('The correct number of dataset cards are rendered with the correct titles in group "prospective"', () => {
    datasetGroup({ expect }, 'prospective', params.datasets.prospective, document)
  })

  const allDatasets = [
    ...(params.datasets.statutory ?? []),
    ...(params.isODPMember ? (params.datasets.expected ?? []) : []),
    ...(params.datasets.prospective ?? [])
  ]
  allDatasets.forEach((dataset, i) => {
    it(`dataset cards are rendered with correct hints for dataset='${dataset.dataset}'`, () => {
      let expectedHint = 'Endpoint URL submitted'
      if (dataset.notice) {
        if (dataset.notice.type === 'due') {
          expectedHint = `You must review your ${datasetSlugToReadableName(dataset.dataset).toLowerCase()} register by ${dataset.notice.deadline} and update it as soon as a new site is identified or an existing one changes status.`
        } else if (dataset.notice.type === 'overdue') {
          expectedHint = `Your ${datasetSlugToReadableName(dataset.dataset).toLowerCase()} dataset is overdue`
        } else {
          throw new Error('Notice type not recognised')
        }
      } else if (dataset.status === 'Not submitted') {
        expectedHint = 'Endpoint URL not submitted'
      } else if (dataset.status === 'Needs improving') {
        expectedHint = 'in this dataset'
      } else if (dataset.status === 'Error') {
        expectedHint = dataset.error || ''
      } else if (dataset.status === 'Error' && dataset.issue_count === 0) {
        expectedHint = `There are ${dataset.issue_count} issues in this dataset`
      } else if (dataset.status === 'Error' && dataset.issue_count === 1) {
        expectedHint = `There is ${dataset.issue_count} issue in this dataset`
      } else if (dataset.status === 'Error' && dataset.issue_count > 1) {
        expectedHint = `There are ${dataset.issue_count} issues in this dataset`
      }
      const datasetCard = document.querySelector(`[data-dataset="${dataset.dataset}"]`)
      expect(datasetCard.querySelector('.govuk-task-list__hint').textContent.trim()).toContain(expectedHint)
    })
  })

  it('Renders the correct actions on each dataset card', () => {
    allDatasets.forEach((dataset, i) => {
      const expectedActions = []
      if (!dataset.endpoint) {
        expectedActions.push({ text: 'Add endpoint', href: '/taskLists/taskChecklist' })
      }
      if (dataset.error) {
        expectedActions.push({ text: 'Fix errors', href: '/taskLists/taskChecklist' })
      } else if (dataset.issue) {
        expectedActions.push({ text: 'Fix issues', href: '/taskLists/taskChecklist' })
      }
      if (dataset.endpoint) {
        expectedActions.push({ text: 'View data', href: '/taskLists/taskChecklist' })
      }
    })
  })

  allDatasets.forEach((dataset) => {
    it(`Renders the correct status on each dataset card for dataset='${dataset.dataset}'`, () => {
      const datasetCard = document.querySelector(`li[data-dataset="${dataset.dataset}"]`)
      if (!datasetCard) {
        throw new Error(`Dataset card for "${dataset.dataset}" not found in rendered HTML`)
      }

      if (!(dataset.status in datasetStatusEnum)) {
        throw new Error(`Unknown dataset status: ${dataset.status}`)
      }

      const expectedStatus = datasetStatusEnum[dataset.status]

      const statusIndicator = datasetCard.querySelector('.govuk-task-list__status')
      expect(statusIndicator.textContent.trim()).toContain(expectedStatus)
    })

    it(`Renders the correct link on each dataset card for dataset='${dataset.dataset}'`, () => {
      const datasetCard = document.querySelector(`li[data-dataset="${dataset.dataset}"]`)
      if (!datasetCard) {
        throw new Error(`Dataset card for "${dataset.dataset}" not found in rendered HTML`)
      }

      const expectedLink = datasetCard.querySelector('.govuk-task-list__link').href

      if (dataset.status === 'Not submitted') {
        expect(expectedLink).toEqual(`/organisations/${params.organisation.organisation}/${dataset.dataset}/get-started`)
      } else {
        expect(expectedLink).toEqual(`/organisations/${params.organisation.organisation}/${dataset.dataset}/overview`)
      }

      const link = datasetCard.querySelector('.govuk-link')
      expect(link.href).toContain(expectedLink)
    })
  })

  let currentNoticeIndex = 0
  const notificationBanners = document.querySelectorAll('.govuk-notification-banner')
  allDatasets.forEach((dataset, i) => {
    if (dataset.notice) {
      const banner = notificationBanners[currentNoticeIndex]
      currentNoticeIndex++

      it(`Renders the notice for dataset ${dataset.dataset}`, () => {
        let expectedHeader
        let expectedHint

        if (dataset.notice.type === 'due') {
          expectedHeader = `You must review your ${datasetSlugToReadableName(dataset.dataset).toLowerCase()} register by ${dataset.notice.deadline}`
        } else if (dataset.notice.type === 'overdue') {
          expectedHeader = `Your ${datasetSlugToReadableName(dataset.dataset).toLowerCase()} dataset is overdue`
          expectedHint = `It was due on ${dataset.notice.deadline}`
        }

        const expectedLinkHref = `/organisations/${params.organisation.organisation}/${dataset.dataset}/get-started`
        const link = banner.querySelector('.govuk-notification-banner__link')

        if (expectedHint) expect(banner.textContent).toContain(expectedHint)
        expect(banner.textContent).toContain(expectedHeader)
        expect(link.getAttribute('href')).toEqual(expectedLinkHref)
      })
    }
  })
})
