import { expect } from 'chai'
import nunjucks from 'nunjucks'
import { JSDOM } from 'jsdom'
import { describe, it } from 'vitest'
import addFilters from '../../../../src/filters/filters'

// Configure Nunjucks
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

const resultsTemplatePath = 'results/results.html'

describe('results.html', () => {
  describe('task lists', () => {
    it('should show passed checks when they exist', async () => {
      const passedCheck = {
        title: {
          text: 'check1'
        },
        href: '',
        status: {
          tag: {
            text: 'Passed',
            classes: 'govuk-tag--green'
          }
        }
      }
      const params = { options: { passedChecks: [passedCheck] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      const passedChecks = dom.window.document.getElementById('passed-checks')
      expect(passedChecks).not.toBeNull()
      expect(passedChecks.innerHTML).to.include('check1')
    })

    it('should not show passed checks when none exist', async () => {
      const params = { options: { passedChecks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.getElementById('passed-checks')).toBeNull()
    })

    it('should show blocking tasks when they exist', async () => {
      const blockingTask = {
        title: {
          text: 'task1'
        },
        href: '',
        status: {
          tag: {
            text: 'Must fix',
            classes: 'govuk-tag--red'
          }
        }
      }
      const params = { options: { blockingTasks: [blockingTask] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      const blockingTasksElement = dom.window.document.getElementById('required-checks')
      expect(blockingTasksElement).not.toBeNull()
      expect(blockingTasksElement.innerHTML).to.include('task1')
    })

    it('should not show blocking tasks when none exist', async () => {
      const params = { options: { blockingTasks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.getElementById('required-checks')).toBeNull()
    })

    it('should show non-blocking tasks when they exist', async () => {
      const nonBlockingTasks = {
        title: {
          text: 'task1'
        },
        href: '',
        status: {
          tag: {
            text: 'Should fix',
            classes: 'govuk-tag--yellow'
          }
        }
      }

      const params = { options: { nonBlockingTasks: [nonBlockingTasks] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      const nonBlockingTasksEl = dom.window.document.getElementById('optional-checks')

      expect(nonBlockingTasksEl).not.toBeNull()
      expect(nonBlockingTasksEl.innerHTML).to.include('task1')
    })

    it('should not show non-blocking tasks when none exist', async () => {
      const params = { options: { nonBlockingTasks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.getElementById('optional-checks')).toBeNull()
    })
  })

  describe('buttons', () => {
    it('should show upload button when blocking tasks exist', async () => {
      const params = { options: { blockingTasks: ['task1'] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.querySelector('a[href="/check/upload-method"]')).not.toBeNull()
      expect(dom.window.document.querySelector('button[type="submit"].govuk-button')).toBeNull()
    })

    it('should show continue button and upload link when no blocking tasks exist', async () => {
      const params = { options: { blockingTasks: [] } }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)
      expect(dom.window.document.querySelector('button[type="submit"].govuk-button')).not.toBeNull()
      expect(dom.window.document.querySelector('button[type="submit"].govuk-button')?.textContent).toContain('Continue')
    })
  })
})
