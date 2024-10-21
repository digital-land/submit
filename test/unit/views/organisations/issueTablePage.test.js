import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'
import { runGenericPageTests } from '../../sharedTests/generic-page.js'
import config from '../../../../config/index.js'
import mocker, { getSeed } from '../../../utils/mocker.js'
import { OrgIssueTable } from '../../../../src/routes/schemas.js'
import { runTableTests } from '../../sharedTests/tableTests.js'

const nunjucks = setupNunjucks({})

const runTestsWithSeed = (seed) => {
  describe(`issueTable.html(seed: ${seed})`, () => {
    const params = mocker(OrgIssueTable, seed)

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
        expect(document.querySelector('.govuk-error-summary__title').textContent).toContain(params.errorSummary.heading || 'There is a problem')
      })

      it('should render the correct heading if none is supplied', () => {
        const noErrorHeadingPageHtml = nunjucks.render('organisations/issueTable.html', {
          ...params,
          errorSummary: {
            items: params.errorSummary.items,
            heading: undefined
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

    runTableTests(params.tableParams, document)

    describe('multi page', () => {
      const items = [
        {
          type: 'number',
          current: false,
          number: 1,
          href: 'organisations/mock-org/mock-dataset/1'
        },
        {
          type: 'number',
          current: true,
          number: 2,
          href: 'organisations/mock-org/mock-dataset/2'
        },
        {
          type: 'number',
          current: false,
          number: 3,
          href: 'organisations/mock-org/mock-dataset/3'
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
          href: 'organisations/mock-org/mock-dataset/10'
        }
      ]
      const next = {
        href: 'organisations/mock-org/mock-dataset/3'
      }
      const previous = {
        href: 'organisations/mock-org/mock-dataset/1'
      }
      params.pagination = {
        previous,
        next,
        items
      }

      const multiPageHtml = nunjucks.render('organisations/issueTable.html', params)

      runGenericPageTests(multiPageHtml, {
        pageTitle: `${params.organisation.name} - ${params.dataset.name} - Issues - ${config.serviceNames.submit}`,
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
  })
}

const seed = getSeed()
runTestsWithSeed(seed)
