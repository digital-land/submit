import { describe, it } from 'vitest'
import nunjucks from 'nunjucks'
import addFilters from '../../src/filters/filters'

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

describe('find page', () => {
  it.todo('renders all the organisations supplied', () => {

  })

  it.todo('has the search box on screen', () => {

  })

  it.todo('has the javascript file for the list-filter', () => {

  })
})
