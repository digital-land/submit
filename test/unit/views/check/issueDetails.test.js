import nunjucks from 'nunjucks'
import { JSDOM } from 'jsdom'
import { describe, it, expect } from 'vitest'
import addFilters from '../../../../src/filters/filters.js'

const env = nunjucks.configure([
  'src/views',
  'node_modules/govuk-frontend/dist/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], { noCache: true })
addFilters(env, { dataSubjects: {} })

describe('Check issue details severity banner', () => {
  it.each([
    ['critical', 'You cannot submit your data until you fix the issues'],
    ['error', 'You can submit your data and fix these issues later']
  ])('shows the submission guidance for %s without quality criteria metadata', (severity, title) => {
    const html = env.render('check/results/issueDetails.html', {
      options: { task: { severity, message: 'Example issue' } }
    })
    const document = new JSDOM(html).window.document
    expect(document.querySelector('.govuk-error-summary__title').textContent.trim()).toBe(title)
  })
})
