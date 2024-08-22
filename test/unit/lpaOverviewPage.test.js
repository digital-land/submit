import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import jsdom from 'jsdom'
import { makeDatasetSlugToReadableNameFilter } from '../../src/filters/makeDatasetSlugToReadableNameFilter.js'

const datasetNameMapping = new Map()
const nunjucks = setupNunjucks({ datasetNameMapping })

describe('LPA Overview Page', () => {
  const params = {
    organisation: {
      name: 'mock org',
      organisation: 'mock-org'
    },
    datasetsWithEndpoints: 2,
    totalDatasets: 8,
    datasetsWithErrors: 2,
    datasetsWithIssues: 2,
    datasets: [
      {
        slug: 'article-4-direction',
        endpoint: null,
        status: 'Not submitted',
        issue_count: 0
      },
      {
        slug: 'article-4-direction-area',
        endpoint: null,
        status: 'Not submitted'
      },
      {
        slug: 'conservation-area',
        endpoint: 'http://conservation-area.json',
        status: 'Needs fixing',
        error: null,
        issue: 'Endpoint has not been updated since 21 May 2023',
        issue_count: 1
      },
      {
        slug: 'conservation-area-document',
        endpoint: 'http://conservation-area-document.json',
        status: 'Live',
        error: null,
        issue_count: 0
      },
      {
        slug: 'listed-building-outline',
        endpoint: 'http://listed-building-outline.json',
        status: 'Live',
        error: null,
        issue_count: 0
      },
      {
        slug: 'tree',
        endpoint: 'http://tree.json',
        error: null,
        status: 'Needs fixing',
        issue: 'There are 20 issues in this dataset',
        issue_count: 1
      },
      {
        slug: 'tree-preservation-order',
        endpoint: 'http://tree-preservation-order.json',
        http_error: '404',
        error: 'There was 404 error accessing the data URL',
        status: 'Error',
        issue_count: 0
      },
      {
        slug: 'tree-preservation-zone',
        endpoint: 'http://tree-preservation-zone.json',
        status: 'Error',
        error: '400',
        issue_count: 0
      }
    ]
  }
  const html = nunjucks.render('organisations/overview.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'mock org overview - Submit and update your planning data',
    breadcrumbs: [{ text: 'Home', href: '/manage' }, { text: 'Organisations', href: '/organisations' }, { text: 'mock org' }]
  })

  const statsBoxes = document.querySelector('.dataset-status').children
  it('Datasets provided gives the correct value', () => {
    expect(statsBoxes[0].textContent).toContain('2/8')
    expect(statsBoxes[0].textContent).toContain('datasets submitted')
  })

  it('Datasets with errors gives the correct value', () => {
    expect(statsBoxes[1].textContent).toContain('2')
    expect(statsBoxes[1].textContent).toContain('data URL with errors')
  })

  it('Datasets with issues gives the correct value', () => {
    expect(statsBoxes[2].textContent).toContain('2')
    expect(statsBoxes[2].textContent).toContain('datasets need fixing')
  })

  const datasetCards = document.querySelector('.govuk-task-list').children
  it('The correct number of dataset cards are rendered with the correct titles', () => {
    expect(datasetCards.length).toEqual(params.datasets.length)

    const datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(datasetNameMapping)

    params.datasets.forEach((dataset, i) => {
      expect(datasetCards[i].querySelector('.govuk-heading-m').textContent).toContain(datasetSlugToReadableName(dataset.slug))
    })
  })

  params.datasets.forEach((dataset, i) => {
    it(`dataset cards are rendered with correct hints for dataset='${dataset.slug}'`, () => {
      let expectedHint = 'Data URL submitted'
      if (dataset.status === 'Not submitted') {
        expectedHint = 'Data URL not submitted'
      } else if (dataset.error) {
        expectedHint = dataset.error
      } else if (dataset.issue_count > 0) {
        expectedHint = `There are ${dataset.issue_count} issues in this dataset`
      }
      expect(datasetCards[i].querySelector('.govuk-task-list__hint').textContent.trim()).toContain(expectedHint)
    })
  })

  it('Renders the correct actions on each dataset card', () => {
    params.datasets.forEach((dataset, i) => {
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

  params.datasets.forEach((dataset, i) => {
    it(`Renders the correct status on each dataset card for dataset='${dataset.slug}'`, () => {
      let expectedHint = 'Live'
      if (dataset.status === 'Not submitted') {
        expectedHint = 'Not submitted'
      } else if (dataset.status === 'Error') {
        expectedHint = dataset.status
      } else if (dataset.status === 'Needs fixing') {
        expectedHint = 'Needs fixing'
      }

      const statusIndicator = datasetCards[i].querySelector('.govuk-task-list__status')
      expect(statusIndicator.textContent.trim()).toContain(expectedHint)
    })
  })
})
