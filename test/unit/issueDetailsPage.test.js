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
    name: 'mock org',
    organisation: 'mock-org'
  }

  const dataset = {
    name: 'mock Dataset',
    dataset: 'mock-dataset'
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

  const issueType = 'mock issue'

  const params = {
    organisation,
    dataset,
    errorHeading,
    issueItems,
    entry,
    issueType
  }

  const html = nunjucks.render('organisations/issueDetails.html', params)
  const dom = new JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `mock org - mock Dataset - Issues - ${config.serviceNames.submit}`,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Organisations', href: '/organisations' },
      { text: 'mock org', href: '/organisations/mock-org' },
      { text: 'mock Dataset', href: '/organisations/mock-org/mock-dataset' },
      { text: 'mock issue' }
    ]
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    expect(document.querySelector('h1').textContent).toContain(params.dataset.name)
  })

  describe('error summary', () => {
    it('should render the correct heading', () => {
      expect(document.querySelector('.govuk-error-summary__title').textContent).toContain(errorHeading)
    })
  
    it('should render the correct heading if none is supplied', () => {
      const noErrorHeadingPageHtml = nunjucks.render('organisations/issueDetails.html', {
        ...params,
        errorHeading: undefined
      })

      const domNoErrorHeading = new JSDOM(noErrorHeadingPageHtml)
      const documentNoErrorHeading = domNoErrorHeading.window.document

      expect(documentNoErrorHeading.querySelector('.govuk-error-summary__title').textContent).toContain('There is a problem')
    })
  
    it('should render the issue items', () => {
      const issueList = document.querySelector('.govuk-error-summary__list')
      const issueItemElements = [...issueList.children]
      expect(issueItemElements.length).toBe(issueItems.length)
  
      issueItemElements.forEach((element, index) => {
        expect(element.textContent).toContain(issueItems[index].html)
      })
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
    const items = [
      {
        type: 'number',
        current: false,
        number: 1,
        href: 'organisations/mock-org/mock-dataset/mock issue/1'
      },
      {
        type: 'number',
        current: true,
        number: 2,
        href: 'organisations/mock-org/mock-dataset/mock issue/2'
      },
      {
        type: 'number',
        current: false,
        number: 3,
        href: 'organisations/mock-org/mock-dataset/mock issue/3'
      },
      {
        type: 'ellipsis',
        ellipsis: true,
        href: '#'
      },
      {
        type: 'number',
        current: false,
        number: 10,
        href: 'organisations/mock-org/mock-dataset/mock issue/10'
      }
    ]
    const next = {
      number: 3,
      href: 'organisations/mock-org/mock-dataset/mock issue/3'
    }
    const previous = {
      number: 1,
      href: 'organisations/mock-org/mock-dataset/mock issue/1'
    }
    const multiPageHtml = nunjucks.render('organisations/issueDetails.html', {
      ...params,
      pagination: {
        previous,
        next,
        items
      },
      issueEntitiesCount: 10,
      entityNumber: 2
    })
    // const multiPageDom = new JSDOM(multiPageHtml)
    // const multiPageDocument = multiPageDom.window.document
    runGenericPageTests(multiPageHtml, {
      pageTitle: `mock org - mock Dataset - Issues (Page 2 of 10) - ${config.serviceNames.submit}`,
      breadcrumbs: [
        { text: 'Home', href: '/' },
        { text: 'Organisations', href: '/organisations' },
        { text: 'mock org', href: '/organisations/mock-org' },
        { text: 'mock Dataset', href: '/organisations/mock-org/mock-dataset' },
        { text: 'mock issue' }
      ]
    })

    const domMultiPage = new JSDOM(multiPageHtml)
    const documentMultiPage = domMultiPage.window.document

    it('correctly renders the pagination component', () => {
      const pagination = documentMultiPage.querySelector('.govuk-pagination')
      const paginationChildren = pagination.children

      expect(paginationChildren.length).toEqual(3)

      const previousLink = paginationChildren[0]
      expect(previousLink.getAttribute('class')).toContain('prev')
      expect(previousLink.children[0].getAttribute('href')).toContain(previous.href)

      const nextLink = paginationChildren[2]
      expect(nextLink.getAttribute('class')).toContain('next')
      expect(nextLink.children[0].getAttribute('href')).toContain(next.href)

      const itemsList = paginationChildren[1]
      expect(itemsList.getAttribute('class')).toContain('list')

      const listElements = itemsList.children

      expect(listElements.length).toEqual(5)

      items.forEach((item, i) => {
        if (item.type === 'number') {
          expect(listElements[i].textContent).toContain(item.number)
          expect(listElements[i].children[0].getAttribute('href')).toEqual(item.href)
        } else if (item.type === 'ellipsis') {
          expect(listElements[i].textContent).toContain('⋯')
        } else {
          expect.fail('pagination item type should be number or ellipsis')
        }
      })
    })
  })
})
