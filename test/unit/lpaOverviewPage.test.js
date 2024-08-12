import { describe, it, expect } from 'vitest'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import { runGenericPageTests } from './generic-page.js'
import jsdom from 'jsdom'
import { makeDatasetSlugToReadableNameFilter } from '../../src/filters/makeDatasetSlugToReadableNameFilter.js'

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

const datasetNameMapping = new Map([

])

addFilters(nunjucksEnv, { datasetNameMapping })

describe('LPA Overview Page', () => {
  const params = {
    organisation: {
      name: 'mock org'
    },
    datasetsWithEndpoints: 2,
    totalDatasets: 8,
    datasetsWithErrors: 2,
    datasetsWithIssues: 2,
    datasets: [
      {
        slug: 'article-4-direction',
        endpoint: null
      },
      {
        slug: 'article-4-direction-area',
        endpoint: null
      },
      {
        slug: 'conservation-area',
        endpoint: 'http://conservation-area.json',
        error: null,
        issue: 'Endpoint has not been updated since 21 May 2023'
      },
      {
        slug: 'conservation-area-document',
        endpoint: 'http://conservation-area-document.json',
        error: null,
        issue: null
      },
      {
        slug: 'listed-building-outline',
        endpoint: 'http://listed-building-outline.json',
        error: null,
        issue: null
      },
      {
        slug: 'tree',
        endpoint: 'http://tree.json',
        error: null,
        issue: 'There are 20 issues in this dataset'
      },
      {
        slug: 'tree-preservation-order',
        endpoint: 'http://tree-preservation-order.json',
        error: 'Error connecting to endpoint',
        issue: null
      },
      {
        slug: 'tree-preservation-zone',
        endpoint: 'http://tree-preservation-zone.json',
        error: 'Error connecting to endpoint',
        issue: null
      }
    ]
  }
  const html = nunjucks.render('organisations/overview.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'mock org overview - Submit and update your planning data'
  })

  const statsBoxes = document.querySelector('.dataset-status').children
  it('Datasets provided gives the correct value', () => {
    expect(statsBoxes[0].textContent).toContain('2/8')
    expect(statsBoxes[0].textContent).toContain('datasets provided')
  })

  it('Datasets with errors gives the correct value', () => {
    expect(statsBoxes[1].textContent).toContain('2')
    expect(statsBoxes[1].textContent).toContain('datasets with errors')
  })

  it('Datasets with issues gives the correct value', () => {
    expect(statsBoxes[2].textContent).toContain('2')
    expect(statsBoxes[2].textContent).toContain('datasets with issues')
  })

  const datasetCards = document.querySelector('.govuk-task-list').children
  it('The correct number of dataset cards are rendered with the correct titles', () => {
    expect(datasetCards.length).toEqual(params.datasets.length)

    const datasetSlugToReadableName = makeDatasetSlugToReadableNameFilter(datasetNameMapping)

    params.datasets.forEach((dataset, i) => {
      expect(datasetCards[i].querySelector('.govuk-heading-m').textContent).toContain(datasetSlugToReadableName(dataset.slug))
    })
  })

  it('The dataset cards are rendered with the correct hints', () => {
    params.datasets.forEach((dataset, i) => {
      const expectedHint = !dataset.endpoint ? 'Endpoint not provided' : dataset.error ? dataset.error : dataset.issue ? dataset.issue : 'Endpoint provided'
      expect(datasetCards[i].querySelector('.govuk-task-list__hint').textContent).toContain(expectedHint)
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

      const actions = datasetCards[i].querySelector('.planning-data-actions').children
      expectedActions.forEach((expectedAction, j) => {
        expect(actions[j].textContent, `expect action ${expectedAction.text} for dataset ${dataset.slug}`).toContain(expectedAction.text)
        const actionLink = actions[j].querySelector('a')
        expect(actionLink.href).toBe(expectedAction.href)
      })
    })
  })

  it('Renders the correct status on each dataset card', () => {
    params.datasets.forEach((dataset, i) => {
      const expectedHint = !dataset.endpoint ? 'Not provided' : dataset.error ? 'Error' : dataset.issue ? 'Issues' : 'No issues'

      const statusIndicator = datasetCards[i].querySelector('.govuk-task-list__status')
      expect(statusIndicator.textContent).toContain(expectedHint)
    })
  })
})
