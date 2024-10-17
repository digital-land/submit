import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'
import { runTableTests } from './sharedTests/tableTests.js'
import prettifyColumnName from '../../src/filters/prettifyColumnName.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'src/views/check',
  'src/views/submit',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {})

nunjucksEnv.addFilter('prettifyColumnName', prettifyColumnName)

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

runTableTests(params.tableParams, document)
