import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'src/views/check',
  'src/views/submit',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {})

nunjucksEnv.addFilter('prettifyColumnName', columnName => columnName)

describe('Table Component', () => {
  const params = {
    tableParams: {
      columns: ['col1', 'col2', 'col3'],
      rows: [
        {
          columns: {
            field1: {
              error: false,
              value: 'value11'
            },
            field2: {
              error: {
                message: 'error in value12'
              },
              value: 'value12'
            },
            field3: {
              error: false,
              value: 'value13'
            }
          }
        },
        {
          columns: {
            field1: {
              error: false,
              html: '<h1>value21</h1>'
            },
            field2: {
              error: false,
              value: 'value22'
            },
            field3: {
              error: {
                message: 'error in value23'
              },
              value: 'value23'
            }
          }
        }
      ],
      fields: ['field1', 'field2', 'field3']
    }
  }

  const htmlString = `
    {% from "components/table.html" import table %}
    {{ table(tableParams) }}
  `

  const html = nunjucks.renderString(htmlString, params)
  const dom = new JSDOM(html)
  const document = dom.window.document

  const tableHead = document.querySelector('.govuk-table__head')

  it('Renders the correct table headings', () => {
    const columnHeadings = tableHead.children[0].children

    params.tableParams.columns.forEach((column, i) => {
      expect(columnHeadings[i].textContent).toContain(column)
    })
  })

  const tableBody = document.querySelector('.govuk-table__body')
  const rows = tableBody.children

  it('Renders the correct number of rows rows', () => {
    expect(rows.length).toEqual(params.tableParams.rows.length)
  })

  it('Renders the correct row content', () => {
    params.tableParams.rows.forEach((rowData, i) => {
      const columns = rows[i].children
      expect(columns.length).toEqual(Object.keys(rowData.columns).length)

      Object.values(rowData.columns).forEach((field, j) => {
        if (field.value) {
          expect(columns[j].textContent).toContain(field.value)
        } else if (field.html) {
          expect(columns[j].innerHTML).toContain(field.html)
        }

        if (field.error) {
          expect(columns[j].textContent).toContain(field.error.message)
        }
      })
    })
  })
})
