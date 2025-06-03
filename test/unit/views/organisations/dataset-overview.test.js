import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'
import { runGenericPageTests } from '../../generic-page.js'
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
          endpoint: 'FOO',
          endpoint_url: 'http://endpoint1.co.uk',
          documentation_url: 'http://endpoint1-docs.co.uk',
          lastAccessed: '2024-09-09',
          lastUpdated: '2024-09-09'
        },
        {
          name: 'endpoint 2',
          endpoint: 'BAR',
          endpoint_url: 'http://endpoint2.co.uk',
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
    pageTitle: 'Mock org - World heritage site buffer zone - Dataset overview - Check and submit planning data'
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual('Mock org')
    expect(document.querySelector('h1').textContent).toContain('World heritage site buffer zone')
  })

  it('Renders the dataset navigation links correctly', () => {
    const links = document.querySelectorAll('.app-c-dataset-navigation .govuk-service-navigation__link')
    const activeLink = document.querySelector('.app-c-dataset-navigation .govuk-service-navigation__item.govuk-service-navigation__item--active')

    expect(document.querySelector('.app-c-dataset-navigation')).not.toBeNull()
    expect(links.length).toEqual(3)
    expect(activeLink.textContent).toContain('Dataset details')
  })

  it('Renders dataset details correctly', () => {
    expect(document.querySelector('#main-content h2.govuk-heading-m').textContent).toContain('Dataset details')
    const summaryListValues = document.querySelectorAll('dd.govuk-summary-list__value')
    expect(summaryListValues[0].textContent.trim()).toEqual(params.stats.numberOfRecords.toString())
    expect(summaryListValues[1].textContent.trim()).toEqual(`${params.stats.numberOfFieldsSupplied}/${params.stats.numberOfExpectedFields}`)
    expect(summaryListValues[2].textContent.trim()).toEqual(`${params.stats.numberOfFieldsMatched}/${params.stats.numberOfExpectedFields}`)
    expect(summaryListValues[3].textContent.trim()).toEqual('Open Government Licence')
    expect(summaryListValues[4].textContent).toContain(params.stats.endpoints[0].endpoint_url)
    expect(summaryListValues[5].textContent).toContain(params.stats.endpoints[0].documentation_url)
    expect(summaryListValues[6].textContent).toContain(govukDateTime(params.stats.endpoints[0].lastAccessed))
    expect(summaryListValues[7].textContent).toContain(govukDateTime(params.stats.endpoints[0].lastUpdated))
    expect(summaryListValues[8].textContent).toContain(params.stats.endpoints[1].endpoint_url)
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

  it('Does not render a notice when none is provided', () => {
    expect(document.querySelector('.govuk-notification-banner')).toBeNull()
  })

  it('Renders a notice when one is provided', () => {
    const paramsWithNotice = {
      ...params,
      notice: {
        type: 'due',
        deadline: 'deadline'
      }
    }

    const htmlWithNotice = stripWhitespace(nunjucks.render('organisations/dataset-overview.html', paramsWithNotice))
    const domWithNotice = new jsdom.JSDOM(htmlWithNotice)
    const documentWithNotice = domWithNotice.window.document
    const banner = documentWithNotice.querySelector('.govuk-notification-banner')

    expect(documentWithNotice.querySelector('.govuk-notification-banner')).not.toBeNull()
    expect(banner.classList.contains('govuk-notification-banner--warning')).toBeFalsy()
    expect(banner.querySelector('.govuk-notification-banner__heading').textContent).toContain(`You must review your ${paramsWithNotice.dataset.dataset.toLowerCase()} register by deadline`)
    expect(banner.querySelector('.govuk-notification-banner__body').textContent).toContain(`Update your register as soon as a new ${paramsWithNotice.dataset.dataset.toLocaleLowerCase()} site is identified or an existing one changes status, to increase trust in the data.`)
    expect(banner.querySelector('.govuk-notification-banner__cta').textContent).toContain('Follow the steps and check your data meets the specifications before you provide it.')
  })

  it('Should render "overdue" notice with correct content', () => {
    const paramsWithNotice = {
      ...params,
      notice: {
        type: 'overdue',
        deadline: 'deadline'
      }
    }

    const htmlWithNotice = stripWhitespace(nunjucks.render('organisations/dataset-overview.html', paramsWithNotice))
    const domWithNotice = new jsdom.JSDOM(htmlWithNotice)
    const documentWithNotice = domWithNotice.window.document
    const banner = documentWithNotice.querySelector('.govuk-notification-banner')

    expect(banner).not.toBeNull()
    expect(banner.textContent).toContain(`Your ${paramsWithNotice.dataset.dataset} dataset is overdue`)
  })

  it('Renders dataset actions sections', () => {
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
    const document = domWithGeometries.window.document

    const actionsColumn = document.querySelector('#main-content .govuk-grid-column-one-third')
    const header = actionsColumn.querySelector('h2.govuk-heading-m')
    const links = actionsColumn.querySelectorAll('.govuk-list li')

    expect(header.textContent.trim()).toEqual('Dataset actions')

    expect(links[0].textContent.trim()).toEqual('Check Article 4 direction area dataset')
    expect(links[0].querySelector('.govuk-link').href).toEqual('/check/link?dataset=article-4-direction-area&orgName=Mock%20org&orgId=mock-org')

    expect(links[1].textContent.trim()).toEqual('Article 4 direction area guidance')
    expect(links[1].querySelector('.govuk-link').href).toEqual('/guidance/specifications/article-4-direction')
  })
})
