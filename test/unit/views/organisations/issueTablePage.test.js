import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'
import mocker from '../utils/mocker.js'
import { OrgIssueTable } from '../../../../src/routes/schemas.js'

const nunjucks = setupNunjucks({})

const seed = new Date().getTime()

describe(`issueDetails.html(seed: ${seed})`, () => {
  const params = mocker(OrgIssueTable, seed)

  params.issueEntitiesCount = undefined

  const html = nunjucks.render('organisations/issueTable.html', params)
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
      expect(document.querySelector('.govuk-error-summary__title').textContent).toContain(params.errorHeading || 'There is a problem')
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
      expect(issueItemElements.length).toBe(params.issueItems.length)

      issueItemElements.forEach((element, index) => {
        expect(element.textContent).toContain(params.issueItems[index].html)
      })
    })
  })

  describe('Table', () => {
    it('should render the table with the correct values', () => {

    })

    it('should render the references as links to the issue details view', () => {

    })

    it('should render the table with the correct errors', () => {

    })
  })

  describe('multi page', () => {
    // runGenericPageTests

    it('correctly renders the pagination component', () => {
    })
  })
})
