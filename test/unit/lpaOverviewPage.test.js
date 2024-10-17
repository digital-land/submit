import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './sharedTests/generic-page.js'
import jsdom from 'jsdom'
import { makeDatasetSlugToReadableNameFilter } from '../../src/filters/makeDatasetSlugToReadableNameFilter.js'
import mocker from '../utils/mocker.js'
import { datasetStatusEnum, OrgOverviewPage } from '../../src/routes/schemas.js'

const datasetNameMapping = new Map()
const nunjucks = setupNunjucks({ datasetNameMapping })

const seed = new Date().getTime()

describe(`LPA Overview Page (seed: ${seed})`, () => {
  const params = mocker(OrgOverviewPage, seed)
  const html = nunjucks.render('organisations/overview.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `${params.organisation.name} overview - Submit and update your planning data`,
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Organisations', href: '/organisations' }, { text: params.organisation.name }]
  })

  const statsBoxes = document.querySelector('.dataset-status').children
  it('Datasets provided gives the correct value', () => {
    expect(statsBoxes[0].textContent).toContain(`${params.datasetsWithEndpoints}/${params.totalDatasets}`)
    expect(statsBoxes[0].textContent).toContain('datasets submitted')
  })

  it('Datasets with errors gives the correct value', () => {
    expect(statsBoxes[1].textContent).toContain(params.datasetsWithErrors)
    expect(statsBoxes[1].textContent).toContain('data URL with errors')
  })

  it('Datasets with issues gives the correct value', () => {
    expect(statsBoxes[2].textContent).toContain(params.datasetsWithIssues)
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
      } else if (dataset.status === 'Needs fixing') {
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
      if (!(dataset.status in datasetStatusEnum)) {
        throw new Error(`Unknown dataset status: ${dataset.status}`)
      }

      const expectedStatus = datasetStatusEnum[dataset.status]

      const statusIndicator = datasetCards[i].querySelector('.govuk-task-list__status')
      expect(statusIndicator.textContent.trim()).toContain(expectedStatus)
    })

    it(`Renders the correct link on each dataset card for dataset='${dataset.slug}'`, () => {
      const expectedLink = datasetCards[i].querySelector('.govuk-task-list__link').href

      if (dataset.status === 'Not submitted') {
        expect(expectedLink).toEqual(`/organisations/${params.organisation.organisation}/${dataset.slug}/get-started`)
      } else {
        expect(expectedLink).toEqual(`/organisations/${params.organisation.organisation}/${dataset.slug}/overview`)
      }

      const link = datasetCards[i].querySelector('.govuk-link')
      expect(link.href).toContain(expectedLink)
    })
  })
})
