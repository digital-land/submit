import { describe, it, expect, vi } from 'vitest'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import jsdom from 'jsdom'
import axios from 'axios'
import organisationsController from '../../src/controllers/OrganisationsController'
// import config from '../../config/index.js'

vi.mock('axios')

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

let mockDom = new jsdom.JSDOM('')
const baseResponseObject = {
  render: (template, params) => {
    const html = nunjucks.render(template, params)
    mockDom = new jsdom.JSDOM(html)
    delete mockDom.window.localStorage
    delete mockDom.window.sessionStorage
  }
}
const baseRequestObject = {}
const mockNextFn = vi.fn()

describe('Organisations', () => {
  describe('find', () => {
    it('should render correctly when the api responds as expected', async () => {
      // object to mock
      // datasette.runQuery -> axios.get

      const mockRows = [
        ['Camdon', 'cam'],
        ['Bristol', 'bristol'],
        ['Leeds', 'leeds'],
        ['Manchester', 'man'],
        ['Newcastle', 'new'],
        ['Liverpool', 'liv']
      ]

      // need to mock the call that returns the list of orgs
      axios.get.mockResolvedValueOnce({
        data: {
          columns: ['name', 'organisation'],
          rows: mockRows
        }
      })

      const req = {
        ...baseRequestObject,
        Organization: {
          organisation: 'MOG',
          name: 'MockOrg'
        }
      }

      // make the call
      await organisationsController.getOrganisations(req, { ...baseResponseObject }, mockNextFn)

      // expect the database to be queried with the correct uri
      expect(axios.get).toHaveBeenCalledOnce()

      const document = mockDom.window.document

      // expect the title to be correct
      expect(document.getElementsByTagName('title')[0].textContent).toContain('Find your organisation - Submit and update your planning data')

      // expect the organisations list to be correct
      const filterItems = [...document.querySelectorAll('li.js-filter-item')]

      mockRows.sort((a, b) => {
        return a[0].localeCompare(b[0])
      }).forEach((row, i) => {
        expect(filterItems[i].textContent).toContain(row[0])
        expect(filterItems[i].getElementsByTagName('a')[0].href).toContain(`/organisations/${row[1]}`)
      })
    })

    it.todo('should render the error page if the api responds with an error')

    it.todo('should render the errors page if the api returns an empty response')
  })

  describe.todo('dashboard', () => {
    it.todo('should render the dashboard correctly if the api returns as expected')

    it.todo('should render the error page if the api throws an error')

    it.todo('should render the 404 page if the api returns an empty response')
  })

  describe.todo('dataset tasklist', () => {
    it.todo('should render the tasklist correctly if the api returns as expected')

    it.todo('should render the 404 page if the organisation was not found')

    it.todo('should render the 404 page if the dataset was not found')

    it.todo('should render the error page if the api throws an error')
  })

  describe.todo('issue details', () => {
    it.todo('should render the page correctly if the api returns as expected')

    it.todo('should render the 404 page if the organisation was not found')

    it.todo('should render the 404 page if the dataset was not found')

    it.todo('should render the 404 page if the issue type was not found')

    it.todo('should render the 500 page if an error occurs')
  })

  describe.todo('endpoint error', () => {
    it.todo('should render the page correctly if the api returns as expected')

    it.todo('should render the 404 page if the organisation was not found')

    it.todo('should render the 404 page if the dataset was not found')

    it.todo('should render the error page if an error occurs')
  })
})
