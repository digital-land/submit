import { describe, it, expect } from 'vitest'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import { JSDOM } from 'jsdom'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'

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

const datasetNameMapping = new Map()
addFilters(nunjucksEnv, { datasetNameMapping })

describe('issueDetails.html', () => {
  const organisation = {
    name: 'Test Organisation'
  }

  const dataset = {
    name: 'Test Dataset'
  }

  const errorHeading = 'Example error heading'
  const issueItems = [
    {
      html: '2 fields are missing values in entry 949',
      href: 'todo'
    },
    {
      html: '3 fields are missing values in entry 950',
      href: 'todo'
    }
  ]

  const entry = {
    title: '20 and 20A Whitbourne Springs',
    fields: [
      {
        key: {
          text: 'description'
        },
        value: {
          html: '20 and 20A Whitbourne Springs'
        },
        classes: ''
      },
      {
        key: {
          text: 'document-url'
        },
        value: {
          html: '<p class="govuk-error-message">document-url missing</p>'
        },
        classes: 'dl-summary-card-list__row--error'
      },
      {
        key: {
          text: 'documentation-url'
        },
        value: {
          html: '<p class="govuk-error-message">documentation-url missing</p>'
        },
        classes: 'dl-summary-card-list__row--error'
      }
    ]
  }

  const params = {
    organisation,
    dataset,
    errorHeading,
    issueItems,
    entry
  }

  const html = nunjucks.render('organisations/issueDetails.html', params)
  const dom = new JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: 'Test Organisation - Test Dataset - Issues - Submit planning and housing data for England',
    serviceName: config.serviceName
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    expect(document.querySelector('h1').textContent).toContain(params.dataset.name)
  })

  it('should render the error heading', () => {
    expect(document.querySelector('.govuk-error-summary__title').textContent).toContain(errorHeading)
  })

  it('should render the issue items', () => {
    const issueList = document.querySelector('.govuk-error-summary__list')
    const issueItemElements = [...issueList.children]
    expect(issueItemElements.length).toBe(issueItems.length)

    issueItemElements.forEach((element, index) => {
      expect(element.textContent).toContain(issueItems[index].html)
    })
  })

  it('should render the entry details', () => {
    const cardHeader = document.querySelector('.govuk-summary-card__title')
    expect(cardHeader.textContent).toContain('20 and 20A Whitbourne Springs')

    const cardBody = document.querySelector('.govuk-summary-list')
    const entryFields = [...cardBody.children]
    expect(entryFields.length).toBe(entry.fields.length)

    entryFields.forEach((element, index) => {
      expect(element.innerHTML).toContain(entry.fields[index].value.html)
    })
  })

  describe('multi page', () => {
    const multiPageHtml = nunjucks.render('organisations/issueDetails.html', { ...params, pageNum: 2, numEntries: 3 })
    // const multiPageDom = new JSDOM(multiPageHtml)
    // const multiPageDocument = multiPageDom.window.document
    runGenericPageTests(multiPageHtml, {
      pageTitle: 'Test Organisation - Test Dataset - Issues (Page 2 of 3) - Submit planning and housing data for England',
      serviceName: config.serviceName
    })

    it.todo('correctly renders the pagination', () => {

    })
  })
})
