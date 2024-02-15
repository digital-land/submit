import { describe, it, expect } from 'vitest'

import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'

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
    const params = {
      options: {
        rows: [
          {
            'Document URL': {
              value: 'https://www.camden.gov.uk/holly-lodge-conservation-area'
            },
            'End date': {
              value: ''
            },
            Geometry: {
              issue: {
                type: 'fake error',
                description: 'fake error'
              },
              value: 'POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))'
            },
            Legislation: {
              value: ''
            },
            Name: {
              value: 'Holly Lodge Estate'
            },
            Notes: {
              value: ''
            },
            Point: {
              value: 'POINT (-0.150097204178 51.564975754948)'
            },
            Reference: {
              value: 'CA20'
            },
            'Start date': {
              value: '01/06/1992'
            },
            'entry-date': {
              issue: {
                type: 'default-value',
                description: 'default-value'
              },
              value: undefined
            },
            geometry: {
              issue: {
                type: 'OSGB',
                description: 'OSGB'
              },
              value: undefined
            },
            organisation: {
              issue: {
                type: 'default-value',
                description: 'default-value'
              },
              value: undefined
            }
          }
        ],
        errorSummary: [
          '1 documentation URL must be a real URL',
          '19 geometries must be in Well-Known Text (WKT) format'
        ],
        dataset: 'Dataset test'
      }
    }
    const html = nunjucks.render('errors.html', params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

    expect(html).toContain('<li> 1 documentation URL must be a real URL </li>')
    expect(html).toContain('<li> 19 geometries must be in Well-Known Text (WKT) format </li>')
    expect(html).toContain('<span class="govuk-caption-l"> Dataset test </span>')
    expect(html).toContain('<td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))</p> <p class="app-inset-text__error">Fake error</p></div> </td>')
  })
})
