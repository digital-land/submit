import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'
import { runGenericPageTests } from './sharedTests/generic-page.js'
import config from '../../config/index.js'
import { OrgIssueDetails } from '../../src/routes/schemas.js'
import mocker from '../utils/mocker.js'

const nunjucks = setupNunjucks({})

const seed = new Date().getTime()

describe(`issueDetails.html(seed: ${seed})`, () => {
  const params = mocker(OrgIssueDetails, seed)

  params.issueEntitiesCount = undefined

  const html = nunjucks.render('organisations/issueDetails.html', params)
  const dom = new JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `${params.organisation.name} - ${params.dataset.name} - Issues - ${config.serviceNames.submit}`,
    breadcrumbs: [
      { text: 'Home', href: '/' },
      { text: 'Organisations', href: '/organisations' },
      { text: params.organisation.name, href: `/organisations/${params.organisation.organisation}` },
      { text: params.dataset.name, href: `/organisations/${params.organisation.organisation}/${params.dataset.dataset}` },
      { text: 'mock issue' }
    ]
  })

  it('Renders the correct headings', () => {
    expect(document.querySelector('span.govuk-caption-xl').textContent).toEqual(params.organisation.name)
    expect(document.querySelector('h1').textContent).toContain(params.dataset.name)
  })

  describe('error summary', () => {
    it('should render the correct heading', () => {
      expect(document.querySelector('.govuk-error-summary__title').textContent).toContain(params.errorSummary.heading || 'There is a problem')
    })

    it('should render the correct heading if none is supplied', () => {
      const noErrorHeadingPageHtml = nunjucks.render('organisations/issueDetails.html', {
        ...params,
        errorSummary: {
          heading: undefined,
          items: params.errorSummary.items
        }
      })

      const domNoErrorHeading = new JSDOM(noErrorHeadingPageHtml)
      const documentNoErrorHeading = domNoErrorHeading.window.document

      expect(documentNoErrorHeading.querySelector('.govuk-error-summary__title').textContent).toContain('There is a problem')
    })

    it('should render the issue items', () => {
      const issueList = document.querySelector('.govuk-error-summary__list')
      const issueItemElements = [...issueList.children]
      expect(issueItemElements.length).toBe(params.errorSummary.items.length)

      issueItemElements.forEach((element, index) => {
        expect(element.textContent).toContain(params.errorSummary.items[index].html)
      })
    })
  })

  it('should render the entry details', () => {
    const cardHeader = document.querySelector('.govuk-summary-card__title')
    expect(cardHeader.textContent).toContain(params.entry.title)

    const cardBody = document.querySelector('.govuk-summary-list')
    const entryFields = [...cardBody.children]
    expect(entryFields.length).toBe(params.entry.fields.length)

    entryFields.forEach((element, index) => {
      expect(element.innerHTML).toContain(params.entry.fields[index].value.html)
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
      href: 'organisations/mock-org/mock-dataset/mock issue/3'
    }
    const previous = {
      href: 'organisations/mock-org/mock-dataset/mock issue/1'
    }
    params.pagination = {
      previous,
      next,
      items
    }
    params.issueEntitiesCount = 10
    const multiPageHtml = nunjucks.render('organisations/issueDetails.html', params)
    // const multiPageDom = new JSDOM(multiPageHtml)
    // const multiPageDocument = multiPageDom.window.document
    const paginationTitleSection = params.issueEntitiesCount > 1 ? `(Page ${params.pageNumber} of ${params.issueEntitiesCount}) ` : ''
    runGenericPageTests(multiPageHtml, {
      pageTitle: `${params.organisation.name} - ${params.dataset.name} - Issues ${paginationTitleSection}- ${config.serviceNames.submit}`,
      breadcrumbs: [
        { text: 'Home', href: '/' },
        { text: 'Organisations', href: '/organisations' },
        { text: params.organisation.name, href: `/organisations/${params.organisation.organisation}` },
        { text: params.dataset.name, href: `/organisations/${params.organisation.organisation}/${params.dataset.dataset}` },
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

  describe('Dataset visualisation: Maps', () => {
    it('should render a map when geometries are passed in', () => {
      const paramWithGeometry = {
        organisation: params.organisation,
        dataset: params.dataset,
        errorSummary: params.errorSummary,
        entry: {
          ...params.entry,
          geometries: ['POINT(0 0)']
        },
        issueType: params.issueType,
        issueField: params.issueField
      }

      const mapHtml = nunjucks.render('organisations/issueDetails.html', paramWithGeometry)
      const mapDom = new JSDOM(mapHtml)
      const mapDocument = mapDom.window.document
      const map = mapDocument.querySelector('#map')

      expect(map).not.toBeNull()
      expect(map.getAttribute('role')).toEqual('region')
      expect(map.getAttribute('aria-label')).toEqual(`Static map showing ${params.dataset.name} for ${params.organisation.name}.`)
    })

    it('should not render a map when no geometries are passed in', () => {
      const paramWithGeometry = {
        organisation: params.organisation,
        dataset: params.dataset,
        errorSummary: params.errorSummary,
        entry: {
          ...params.entry,
          geometries: []
        },
        issueType: params.issueType,
        issueField: params.issueField
      }

      const mapHtml = nunjucks.render('organisations/issueDetails.html', paramWithGeometry)
      const mapDom = new JSDOM(mapHtml)
      const mapDocument = mapDom.window.document
      const map = mapDocument.querySelector('#map')

      expect(map).toBeNull()
    })
  })
})
