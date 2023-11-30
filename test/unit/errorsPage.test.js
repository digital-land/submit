import { describe, it, expect } from 'vitest'

import nunjucks from 'nunjucks'
const { govukMarkdown } = require('@x-govuk/govuk-prototype-filters')

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'node_modules/govuk-frontend/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  dev: true,
  noCache: true,
  watch: true
})

nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)

describe('errors page', () => {
  it('renders the correct number of errors', () => {
    const params = {
      options: {
        rows: [
          {
            'Document URL': {
              error: false,
              value: 'https://www.camden.gov.uk/holly-lodge-conservation-area'
            },
            'End date': {
              error: false,
              value: ''
            },
            Geometry: {
              error: 'fake error',
              value: 'POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))'
            },
            Legislation: {
              error: false,
              value: ''
            },
            Name: {
              error: false,
              value: 'Holly Lodge Estate'
            },
            Notes: {
              error: false,
              value: ''
            },
            Point: {
              error: false,
              value: 'POINT (-0.150097204178 51.564975754948)'
            },
            Reference: {
              error: false,
              value: 'CA20'
            },
            'Start date': {
              error: false,
              value: '01/06/1992'
            },
            'entry-date': {
              error: 'default-value',
              value: undefined
            },
            geometry: {
              error: 'OSGB',
              value: undefined
            },
            organisation: {
              error: 'default-value',
              value: undefined
            }
          }
        ],
        issueCounts: {
          geography: 1
        },
        dataset: 'Dataset test'
      },
    }
    const html = nunjucks.render('errors.html', params).replace(/(\r\n|\n|\r)/gm, '').replace(/\t/gm, '').replace(/\s+/g, ' ')

    expect(html).toContain('<li>1 issue, relating to geography</li>')
    expect(html).toContain('<span class="govuk-caption-l"> Dataset test </span>')
    expect(html).toContain('<td class="govuk-table__cell app-wrap"> <div class="govuk-inset-text app-inset-text---error"> <p class="app-inset-text__value">POLYGON ((-0.125888391245 51.54316508186, -0.125891457623 51.543177267548, -0.125903428774 51.54322160042))</p> <p class="app-inset-text__error">fake error</p></div> </td>')
  })
})
