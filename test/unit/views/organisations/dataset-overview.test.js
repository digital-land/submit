import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'
import { runGenericPageTests } from '../../sharedTests/generic-page.js'
import { stripWhitespace } from '../../../utils/stripWhiteSpace.js'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

import xGovFilters from '@x-govuk/govuk-prototype-filters'
const { govukDateTime } = xGovFilters

describe('Dataset Overview Page', () => {
  const params = {
    organisation: {
      name: 'Mock org',
      organisation: 'mock-org'
    },
    dataset: {
      dataset: 'world-heritage-site-buffer-zone',
      name: 'World heritage site buffer zone',
      collection: 'world-heritage-site'
    },
    stats: {
      numberOfRecords: 10,
      numberOfFieldsSupplied: 5,
      numberOfFieldsMatched: 6,
      numberOfExpectedFields: 10,
      endpoints: [
        {
          name: 'endpoint 1',
          endpoint: 'http://endpoint1.co.uk',
          documentation_url: 'http://endpoint1-docs.co.uk',
          lastAccessed: '2024-09-09',
          lastUpdated: '2024-09-09'
        },
        {
          name: 'endpoint 2',
          endpoint: 'http://endpoint2.co.uk',
          lastAccessed: '2024-19-19',
          lastUpdated: '2024-19-19',
          error: {
            code: 404,
            exception: ''
          }
        }
      ]
    }
  }

  const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })
  const html = stripWhitespace(nunjucks.render('organisations/dataset-overview.html', params))

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'Mock org - World heritage site buffer zone - Dataset overview - Submit and update your planning data'
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual('Mock org')
    expect(document.querySelector('h1').textContent).toContain('World heritage site buffer zone')
  })

  it('Renders the dataset navigation links correctly', () => {
    const links = document.querySelectorAll('.app-c-dataset-navigation .govuk-service-navigation__link')
    const activeLink = document.querySelector('.app-c-dataset-navigation .govuk-service-navigation__item.govuk-service-navigation__item--active')

    expect(document.querySelector('.app-c-dataset-navigation')).not.toBeNull()
    expect(links.length).toEqual(2)
    expect(activeLink.textContent).toContain('Dataset overview')
  })

  it('Renders dataset details correctly', () => {
    expect(document.querySelector('h2.govuk-heading-m').textContent).toContain('Dataset details')
    const summaryListValues = document.querySelectorAll('dd.govuk-summary-list__value')
    expect(summaryListValues[0].textContent.trim()).toEqual(params.stats.numberOfRecords.toString())
    expect(summaryListValues[1].textContent.trim()).toEqual(`${params.stats.numberOfFieldsSupplied}/${params.stats.numberOfExpectedFields}`)
    expect(summaryListValues[2].textContent.trim()).toEqual(`${params.stats.numberOfFieldsMatched}/${params.stats.numberOfExpectedFields}`)
    expect(summaryListValues[3].textContent.trim()).toEqual('Open Government Licence')
    expect(summaryListValues[4].textContent).toContain(params.stats.endpoints[0].endpoint)
    expect(summaryListValues[5].textContent).toContain(params.stats.endpoints[0].documentation_url)
    expect(summaryListValues[6].textContent).toContain(govukDateTime(params.stats.endpoints[0].lastAccessed))
    expect(summaryListValues[7].textContent).toContain(govukDateTime(params.stats.endpoints[0].lastUpdated))
    expect(summaryListValues[8].textContent).toContain(params.stats.endpoints[1].endpoint)
    expect(summaryListValues[9].textContent).toContain(govukDateTime(params.stats.endpoints[1].lastAccessed))
    expect(summaryListValues[9].textContent).toContain(params.stats.endpoints[1].error.code)
    expect(summaryListValues[10].textContent).toContain(govukDateTime(params.stats.endpoints[1].lastUpdated))
  })

  it('Renders breadcrumbs correctly', () => {
    const breadcrumbs = document.querySelectorAll('.govuk-breadcrumbs__list-item')
    expect(breadcrumbs.length).toEqual(4)
    expect(breadcrumbs[0].textContent).toContain('Home')
    expect(breadcrumbs[1].textContent).toContain('Organisations')
    expect(breadcrumbs[2].textContent).toContain('Mock org')
    expect(breadcrumbs[3].textContent).toContain('World heritage site buffer zone')
  })

  it('Does not render the map section when non mappable dataset is viewed', () => {
    expect(document.querySelector('#map')).toBeNull()
  })

  it('Renders the map section when a mappable dataset is viewed', () => {
    const paramsWithGeometries = {
      ...params,
      dataset: {
        dataset: 'article-4-direction-area',
        name: 'Article 4 direction area',
        collection: 'article-4-direction'
      }
    }
    const htmlWithGeometries = stripWhitespace(nunjucks.render('organisations/dataset-overview.html', paramsWithGeometries))
    const domWithGeometries = new jsdom.JSDOM(htmlWithGeometries)
    const documentWithGeometries = domWithGeometries.window.document

    expect(documentWithGeometries.querySelector('#map')).not.toBeNull()
    expect(documentWithGeometries.querySelector('script[src="/public/js/map.bundle.js"]')).not.toBeNull()
  })
})
