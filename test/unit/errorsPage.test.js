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

    const html = nunjucks.render('errors.html', params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

    expect(html).toContain('<li> 1 documentation URL must be a real URL </li>')
    expect(html).toContain('<li> 19 geometries must be in Well-Known Text (WKT) format </li>')
    expect(html).toContain('<span class="govuk-caption-l"> Dataset test </span>')
    expect(html).toContain('<td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))</p> <p class="app-inset-text__error">Fake error</p></div> </td>')
  })
})
