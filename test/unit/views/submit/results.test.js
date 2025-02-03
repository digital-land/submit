import nunjucks from 'nunjucks'
import { JSDOM } from 'jsdom'
import { expect, describe, it } from 'vitest'
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

  describe('tabbing functionality', () => {
    it('should show both tabs when both have data', async () => {
      const params = {
        options: {
          geometries: ['geometry1'],
          tableParams: { rows: ['row1'] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      expect(mapTab).not.toBeNull()
      expect(tableTab).not.toBeNull()
    })

    it('should only show map tab when only geometries exist', async () => {
      const params = {
        options: {
          geometries: ['geometry1'],
          tableParams: { rows: [] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      expect(mapTab).not.toBeNull()
      expect(tableTab).toBeNull()
    })

    it('should only show table tab when only table data exists', async () => {
      const params = {
        options: {
          geometries: undefined,
          tableParams: { rows: ['row1'] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html, {
        url: 'http://example.com' // need this to avoid localStorage is not available for opaque origins
      })

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      expect(mapTab).toBeNull()
      expect(tableTab).not.toBeNull()
    })

    it('should default to map tab when both tabs are present', async () => {
      const params = {
        options: {
          geometries: ['geometry1'],
          tableParams: { rows: ['row1'] }
        }
      }
      const html = await nunjucksEnv.render(resultsTemplatePath, params)
      const dom = new JSDOM(html)

      const mapTab = dom.window.document.getElementById('map-tab')
      const tableTab = dom.window.document.getElementById('table-tab')

      // Check if map tab is active by default
      expect(mapTab.classList.contains('govuk-tabs__panel--hidden')).to.equal(false)
      expect(tableTab.classList.contains('govuk-tabs__panel--hidden')).to.equal(true)
    })
  })
})
