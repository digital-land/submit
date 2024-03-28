import { describe, it, expect } from 'vitest'
import RequestData from '../../src/models/requestData.js'

import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'

import errorResponse from '../../docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors.json'

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'node_modules/govuk-frontend/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  dev: true,
  noCache: true,
  watch: true
})

addFilters(nunjucksEnv)

describe('errors page', () => {
  it('renders the correct number of errors', () => {
    const requestData = new RequestData(errorResponse)

    const params = {
      options: {
        requestParams: requestData.getParams(),
        errorSummary: requestData.getErrorSummary(),
        rows: requestData.getRows(),
        geometryKey: requestData.getGeometryKey(),
        columns: requestData.getColumns(),
        fields: requestData.getFields(),
        verboseRows: requestData.getRowsWithVerboseColumns()
      }
    }

    const html = nunjucks.render('no-errors.html', params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

    expect(html).toContain('make some checks to the template to make sure it is rendering as expected')
  })
})
