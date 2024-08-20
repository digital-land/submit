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
  it('should correctly obtain relevant data then render the find page', async () => {
    // object to mock
    // datasette.runQuery -> axios.get

    // need to mock the call that returns the list of orgs
    axios.get.mockResolvedValueOnce({
      data: {
        columns: ['name', 'organisation'],
        rows: [
          ['Camdon', 'cam'],
          ['Bristol', 'bristol'],
          ['Leeds', 'leeds'],
          ['Manchester', 'man'],
          ['Newcastle', 'new'],
          ['Liverpool', 'liv']
        ]
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
    expect(axios.get).toHaveBeenLastCalledWith()

    // expect the
    expect(mockDom.window.document.getElementsByTagName('title')[0].textContent).toContain('Find your organisation - Submit and update your planning data')
  })
})
