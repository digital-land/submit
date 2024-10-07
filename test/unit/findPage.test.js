import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import jsdom from 'jsdom'
import { runGenericPageTests } from './sharedTests/generic-page.js'
import config from '../../config/index.js'
import mock from '../utils/mocker.js'
import { OrgFindPage } from '../../src/routes/schemas.js'

const nunjucks = setupNunjucks({})

const seed = new Date().getTime()

describe(`Organisations Find Page (seed: ${seed})`, () => {
  const params = mock(OrgFindPage, seed)

  const html = nunjucks.render('organisations/find.html', params)

  const dom = new jsdom.JSDOM(html)
  const document = dom.window.document

  runGenericPageTests(html, {
    pageTitle: `Find your organisation - ${config.serviceNames.submit}`,
    breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Organisations' }]
  })

  it('correct has a form element with the correct data-filter attribute', () => {
    const formElement = document.querySelector('form')
    expect(formElement.getAttribute('data-filter')).toBe('form')
  })

  it('correctly has elements with the data-filter=block and data-filter=inner block attributes', () => {
    const blockElements = document.querySelectorAll('[data-filter="block"]')
    expect(blockElements.length).toBeGreaterThan(0)

    const innerBlockElements = document.querySelectorAll('[data-filter="inner-block"]')
    expect(innerBlockElements.length).toBeGreaterThan(0)

    expect(blockElements.length).toEqual(innerBlockElements.length)
  })

  it('Renders the correct organisation list with appropriate attributes', () => {
    const organisationList = document.querySelector('#search_results')
    expect(organisationList.children.length).toBe(Object.keys(params.alphabetisedOrgs).length)

    Object.keys(params.alphabetisedOrgs).forEach((letter, i) => {
      const organisationSection = organisationList.children[i]
      expect(organisationSection.querySelector('.blockHeading').textContent).toBe(letter)
      const organisationListItems = organisationSection.querySelector('.govuk-list').children
      params.alphabetisedOrgs[letter].forEach((organisation, j) => {
        expect(organisationListItems[j].textContent).toContain(organisation.name)
        expect(organisationListItems[j].getAttribute('data-filter')).toEqual('item')
        expect(organisationListItems[j].getAttribute('data-filter-terms')).toEqual(organisation.name)
      })
    })
  })
})
