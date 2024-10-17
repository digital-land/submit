import { describe, it, expect } from 'vitest'
import RequestData from '../../src/models/requestData.js'

import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'
import jsdom from 'jsdom'

import errorResponse from '../../docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors.json'
import errorResponseDetails from '../../docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors-details.json'
import ResponseDetails from '../../src/models/responseDetails.js'
import paginationTemplateTests from './sharedTests/paginationTemplateTests.js'
import prettifyColumnName from '../../src/filters/prettifyColumnName.js'

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

addFilters(nunjucksEnv, { dataSubjects: {} })

describe('errors page', () => {
  it('renders the correct number of errors', () => {
    const requestData = new RequestData(errorResponse)

    const responseDetails = new ResponseDetails('id', errorResponseDetails, { totalResults: 3, offset: 0, limit: 50 }, requestData.getColumnFieldLog())

    requestData.response.pagination = {
      totalResults: 100,
      offset: 0,
      limit: 50
    }

    const params = {
      options: {
        tableParams: {
          columns: responseDetails.getColumns(),
          rows: responseDetails.getRowsWithVerboseColumns(requestData.hasErrors()),
          fields: responseDetails.getFields()
        },
        requestParams: requestData.getParams(),
        errorSummary: requestData.getErrorSummary(),
        mappings: responseDetails.getFieldMappings(),
        verboseRows: responseDetails.getRowsWithVerboseColumns(),
        pagination: responseDetails.getPagination(0)
      }
    }

    const html = nunjucks.render('results/errors.html', params)

    const dom = new jsdom.JSDOM(html)
    const document = dom.window.document

    // error summary
    const errorSummary = document.querySelector('.govuk-list')
    expect(errorSummary).not.toBeNull()
    const errorItems = errorSummary.children
    expect(errorItems.length).toEqual(6)

    params.options.errorSummary.forEach((message, i) => {
      expect(errorItems[i].textContent).toContain(message)
    })

    // table
    const table = document.querySelector('.govuk-table')
    expect(table).not.toBeNull()

    const tHead = table.querySelector('.govuk-table__head')
    const columnHeaders = tHead.querySelectorAll('.govuk-table__header')

    params.options.tableParams.columns.forEach((header, i) => {
      expect(columnHeaders[i].textContent).toContain(prettifyColumnName(header))
    })

    const tBody = table.querySelector('.govuk-table__body')
    const tRows = tBody.querySelectorAll('.govuk-table__row')

    params.options.tableParams.rows.forEach((row, i) => {
      const rowColumns = tRows[i].querySelectorAll('.govuk-table__cell')
      Object.entries(row.columns).forEach(([key, value], j) => {
        expect(rowColumns[j].textContent).toContain(value.value)
        if (value.error) {
          expect(rowColumns[j].textContent).toContain(prettifyColumnName(value.error.message))
        }
      })
    })
  })

  paginationTemplateTests('results/errors.html', nunjucks)
})
